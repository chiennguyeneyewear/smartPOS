import type { ProductImportRow, ProductImportResult } from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";

const DEFAULT_UNIT_NAME = "Cái";
const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Lỗi không xác định";
}

// Bulk-imports a parsed KiotViet-style product export. The original version
// did one findUnique + one upsert (+ one stock upsert) per row — correct,
// but ~500ms of Neon round-trip latency per row means a 40,000-row file
// would take hours and blow well past any HTTP request timeout. This
// version instead processes rows in chunks, each chunk doing one query to
// find which SKUs already exist, one bulk createMany() for the new ones,
// and parallel per-row writes only for updates and stock sync (Prisma has
// no bulk-upsert-with-varying-values primitive) — turning ~3N sequential
// round-trips into a handful of chunk-sized ones.
export async function importProducts(rows: ProductImportRow[], branchId?: string): Promise<ProductImportResult> {
  const categoryNames = [...new Set(rows.map((r) => r.categoryName?.trim()).filter((n): n is string => !!n))];
  const unitNames = [
    ...new Set([DEFAULT_UNIT_NAME, ...rows.map((r) => r.unitName?.trim()).filter((n): n is string => !!n)]),
  ];

  if (categoryNames.length > 0) {
    await prisma.category.createMany({ data: categoryNames.map((name) => ({ name })), skipDuplicates: true });
  }
  await prisma.unit.createMany({ data: unitNames.map((name) => ({ name })), skipDuplicates: true });

  const [categories, units] = await Promise.all([
    categoryNames.length > 0
      ? prisma.category.findMany({ where: { name: { in: categoryNames } } })
      : Promise.resolve([]),
    prisma.unit.findMany({ where: { name: { in: unitNames } } }),
  ]);
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));
  const unitIdByName = new Map(units.map((u) => [u.name, u.id]));
  const defaultUnitId = unitIdByName.get(DEFAULT_UNIT_NAME)!;

  function toProductData(row: ProductImportRow) {
    const unitId = (row.unitName?.trim() && unitIdByName.get(row.unitName.trim())) || defaultUnitId;
    const categoryId = row.categoryName?.trim() ? (categoryIdByName.get(row.categoryName.trim()) ?? null) : null;
    return {
      barcode: row.barcode?.trim() || null,
      name: row.name,
      imageUrl: row.imageUrl?.trim() || null,
      categoryId,
      unitId,
      costPrice: row.costPrice,
      sellPrice: row.sellPrice,
      isActive: row.isActive,
    };
  }

  const result: ProductImportResult = { created: 0, updated: 0, errors: [] };
  const withRowNum = rows.map((row, i) => ({ row, sourceRow: i + 2 })); // +2: 1-indexed, plus header row

  for (const batch of chunk(withRowNum, CHUNK_SIZE)) {
    let existingBySku: Map<string, string>;
    try {
      const existing = await prisma.product.findMany({
        where: { sku: { in: batch.map((b) => b.row.sku) } },
        select: { id: true, sku: true },
      });
      existingBySku = new Map(existing.map((p) => [p.sku, p.id]));
    } catch (err) {
      for (const b of batch) result.errors.push({ row: b.sourceRow, sku: b.row.sku, message: message(err) });
      continue;
    }

    const toCreate = batch.filter((b) => !existingBySku.has(b.row.sku));
    const toUpdate = batch.filter((b) => existingBySku.has(b.row.sku));

    if (toCreate.length > 0) {
      try {
        const created = await prisma.product.createMany({
          data: toCreate.map((b) => ({ sku: b.row.sku, ...toProductData(b.row) })),
          skipDuplicates: true,
        });
        result.created += created.count;
      } catch {
        for (const b of toCreate) {
          try {
            await prisma.product.create({ data: { sku: b.row.sku, ...toProductData(b.row) } });
            result.created++;
          } catch (rowErr) {
            result.errors.push({ row: b.sourceRow, sku: b.row.sku, message: message(rowErr) });
          }
        }
      }
    }

    await Promise.all(
      toUpdate.map(async (b) => {
        try {
          await prisma.product.update({ where: { id: existingBySku.get(b.row.sku)! }, data: toProductData(b.row) });
          result.updated++;
        } catch (err) {
          result.errors.push({ row: b.sourceRow, sku: b.row.sku, message: message(err) });
        }
      }),
    );

    if (branchId) {
      const withStock = batch.filter((b) => typeof b.row.stockQuantity === "number");
      if (withStock.length > 0) {
        const idsBySku = new Map(
          (
            await prisma.product.findMany({
              where: { sku: { in: withStock.map((b) => b.row.sku) } },
              select: { id: true, sku: true },
            })
          ).map((p) => [p.sku, p.id]),
        );
        await Promise.all(
          withStock.map(async (b) => {
            const productId = idsBySku.get(b.row.sku);
            if (!productId) return;
            try {
              await prisma.stockItem.upsert({
                where: { productId_branchId: { productId, branchId } },
                create: { productId, branchId, quantity: b.row.stockQuantity! },
                update: { quantity: b.row.stockQuantity! },
              });
            } catch (err) {
              result.errors.push({ row: b.sourceRow, sku: b.row.sku, message: message(err) });
            }
          }),
        );
      }
    }
  }

  return result;
}
