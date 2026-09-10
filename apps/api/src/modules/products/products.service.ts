import type { ProductImportRow, ProductImportResult } from "@smartpos/shared";
import { prisma } from "../../lib/prisma.js";

const DEFAULT_UNIT_NAME = "Cái";

// Bulk-imports a parsed KiotViet-style product export. Deliberately NOT
// wrapped in one Prisma transaction — with hundreds of rows against Neon's
// latency, a single interactive transaction reliably blows past the 5s
// timeout (seen repeatedly with far smaller operations in this codebase).
// Each row is upserted independently instead: a failed row is recorded and
// skipped rather than rolling back everything already imported.
export async function importProducts(rows: ProductImportRow[], branchId?: string): Promise<ProductImportResult> {
  const categoryNames = [...new Set(rows.map((r) => r.categoryName?.trim()).filter((n): n is string => !!n))];
  const unitNames = [
    ...new Set([DEFAULT_UNIT_NAME, ...rows.map((r) => r.unitName?.trim()).filter((n): n is string => !!n)]),
  ];

  if (categoryNames.length > 0) {
    await prisma.category.createMany({
      data: categoryNames.map((name) => ({ name })),
      skipDuplicates: true,
    });
  }
  await prisma.unit.createMany({
    data: unitNames.map((name) => ({ name })),
    skipDuplicates: true,
  });

  const [categories, units] = await Promise.all([
    categoryNames.length > 0
      ? prisma.category.findMany({ where: { name: { in: categoryNames } } })
      : Promise.resolve([]),
    prisma.unit.findMany({ where: { name: { in: unitNames } } }),
  ]);
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));
  const unitIdByName = new Map(units.map((u) => [u.name, u.id]));
  const defaultUnitId = unitIdByName.get(DEFAULT_UNIT_NAME)!;

  const result: ProductImportResult = { created: 0, updated: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      const unitId = (row.unitName?.trim() && unitIdByName.get(row.unitName.trim())) || defaultUnitId;
      const categoryId = row.categoryName?.trim() ? (categoryIdByName.get(row.categoryName.trim()) ?? null) : null;

      const existing = await prisma.product.findUnique({ where: { sku: row.sku }, select: { id: true } });
      const product = await prisma.product.upsert({
        where: { sku: row.sku },
        create: {
          sku: row.sku,
          barcode: row.barcode?.trim() || null,
          name: row.name,
          imageUrl: row.imageUrl?.trim() || null,
          categoryId,
          unitId,
          costPrice: row.costPrice,
          sellPrice: row.sellPrice,
          isActive: row.isActive,
        },
        update: {
          barcode: row.barcode?.trim() || null,
          name: row.name,
          imageUrl: row.imageUrl?.trim() || null,
          categoryId,
          unitId,
          costPrice: row.costPrice,
          sellPrice: row.sellPrice,
          isActive: row.isActive,
        },
      });

      if (typeof row.stockQuantity === "number" && branchId) {
        await prisma.stockItem.upsert({
          where: { productId_branchId: { productId: product.id, branchId } },
          create: { productId: product.id, branchId, quantity: row.stockQuantity },
          update: { quantity: row.stockQuantity },
        });
      }

      if (existing) result.updated++;
      else result.created++;
    } catch (err) {
      result.errors.push({
        row: i + 2, // +2: 1-indexed, plus the header row
        sku: row.sku,
        message: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    }
  }

  return result;
}
