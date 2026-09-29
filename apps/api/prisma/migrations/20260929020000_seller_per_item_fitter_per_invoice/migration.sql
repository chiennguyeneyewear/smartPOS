-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_sellerId_fkey";

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "sellerId" TEXT;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "sellerId";

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sales_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

