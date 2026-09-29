-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_fitterId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_sellerId_fkey";

-- AlterTable
ALTER TABLE "invoice_items" DROP COLUMN "fitterId",
DROP COLUMN "sellerId";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "fitterId" TEXT,
ADD COLUMN     "sellerId" TEXT;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sales_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_fitterId_fkey" FOREIGN KEY ("fitterId") REFERENCES "sales_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

