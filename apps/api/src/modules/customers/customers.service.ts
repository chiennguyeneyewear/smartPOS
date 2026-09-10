import type { CustomerImportRow, CustomerImportResult } from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";

const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Lỗi không xác định";
}

function toCustomerData(row: CustomerImportRow) {
  return {
    name: row.name,
    phone: row.phone?.trim() || null,
    address: row.address?.trim() || null,
    ward: row.ward?.trim() || null,
    groupName: row.groupName?.trim() || null,
    birthday: row.birthday ? new Date(row.birthday) : null,
    gender: row.gender ?? null,
    email: row.email?.trim() || null,
    facebook: row.facebook?.trim() || null,
    note: row.note?.trim() || null,
    ...(typeof row.debtBalance === "number" ? { debtBalance: row.debtBalance } : {}),
  };
}

// Bulk-imports a parsed KiotViet-style customer export. The original version
// of this did one findUnique + one create/update per row — correct, but
// ~500ms of Neon round-trip latency per row means 40,000 rows would take
// hours and blow well past any HTTP request timeout. This version instead:
//   1. Assigns auto-generated codes up front with a single lookup, instead
//      of the old per-row generateCustomerCode() query.
//   2. Processes rows in chunks, each chunk doing exactly ONE query to find
//      which codes already exist, then one bulk createMany() for the new
//      ones and parallel updates for the existing ones — turning ~2N
//      sequential round-trips into a handful of chunk-sized ones.
// Not wrapped in one Prisma transaction across the whole import, same
// reasoning as before: a single interactive transaction over tens of
// thousands of rows would still blow past Neon's timeout even if fast.
export async function importCustomers(rows: CustomerImportRow[], createdById: string): Promise<CustomerImportResult> {
  const result: CustomerImportResult = { created: 0, updated: 0, errors: [] };

  const lastCustomer = await prisma.customer.findFirst({
    where: { code: { startsWith: "KH" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let nextCodeNumber = lastCustomer ? Number(lastCustomer.code.slice(2)) + 1 || 1 : 1;

  const normalized = rows.map((row, i) => ({
    row,
    code: row.code?.trim() || `KH${String(nextCodeNumber++).padStart(6, "0")}`,
    sourceRow: i + 2, // +2: 1-indexed, plus the header row
  }));

  for (const batch of chunk(normalized, CHUNK_SIZE)) {
    let existingByCode: Map<string, string>;
    try {
      const existing = await prisma.customer.findMany({
        where: { code: { in: batch.map((b) => b.code) } },
        select: { id: true, code: true },
      });
      existingByCode = new Map(existing.map((c) => [c.code, c.id]));
    } catch (err) {
      for (const b of batch) result.errors.push({ row: b.sourceRow, name: b.row.name, message: message(err) });
      continue;
    }

    const toCreate = batch.filter((b) => !existingByCode.has(b.code));
    const toUpdate = batch.filter((b) => existingByCode.has(b.code));

    if (toCreate.length > 0) {
      try {
        const created = await prisma.customer.createMany({
          data: toCreate.map((b) => ({ ...toCustomerData(b.row), code: b.code, createdById })),
          skipDuplicates: true,
        });
        result.created += created.count;
      } catch {
        // Bulk insert failed (e.g. a bad value in one row) — fall back to
        // per-row creates just for this chunk so we can isolate which rows
        // actually failed instead of losing the whole chunk.
        for (const b of toCreate) {
          try {
            await prisma.customer.create({ data: { ...toCustomerData(b.row), code: b.code, createdById } });
            result.created++;
          } catch (rowErr) {
            result.errors.push({ row: b.sourceRow, name: b.row.name, message: message(rowErr) });
          }
        }
      }
    }

    await Promise.all(
      toUpdate.map(async (b) => {
        try {
          await prisma.customer.update({ where: { id: existingByCode.get(b.code)! }, data: toCustomerData(b.row) });
          result.updated++;
        } catch (err) {
          result.errors.push({ row: b.sourceRow, name: b.row.name, message: message(err) });
        }
      }),
    );
  }

  return result;
}
