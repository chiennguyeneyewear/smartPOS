import type { CustomerImportRow, CustomerImportResult } from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";
import { generateCustomerCode } from "../../lib/codes.js";

// Bulk-imports a parsed KiotViet-style customer export. Not wrapped in one
// Prisma transaction, same reasoning as importProducts: hundreds of rows
// against Neon's latency reliably blows past the 5s interactive-transaction
// timeout, so each row is upserted independently and a failure is recorded
// per-row instead of rolling back the whole batch.
export async function importCustomers(rows: CustomerImportRow[], createdById: string): Promise<CustomerImportResult> {
  const result: CustomerImportResult = { created: 0, updated: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const code = row.code?.trim() || null;
      const existing = code ? await prisma.customer.findUnique({ where: { code } }) : null;

      const data = {
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

      if (existing) {
        await prisma.customer.update({ where: { id: existing.id }, data });
        result.updated++;
      } else {
        const finalCode = code ?? (await generateCustomerCode());
        await prisma.customer.create({ data: { ...data, code: finalCode, createdById } });
        result.created++;
      }
    } catch (err) {
      result.errors.push({
        row: i + 2, // +2: 1-indexed, plus the header row
        name: row.name,
        message: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    }
  }

  return result;
}
