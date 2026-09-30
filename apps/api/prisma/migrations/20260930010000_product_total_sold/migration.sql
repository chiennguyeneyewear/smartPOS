-- AlterTable
ALTER TABLE "products" DROP COLUMN IF EXISTS "displayOrder",
ADD COLUMN     "totalSold" INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing completed sales so bestseller order reflects real history, not just future sales.
UPDATE "products" p
SET "totalSold" = COALESCE(sub.total, 0)
FROM (
  SELECT ii."productId" AS id, ROUND(SUM(ii."quantity"))::int AS total
  FROM "invoice_items" ii
  JOIN "invoices" i ON i.id = ii."invoiceId"
  WHERE i.status = 'COMPLETED'
  GROUP BY ii."productId"
) sub
WHERE p.id = sub.id;
