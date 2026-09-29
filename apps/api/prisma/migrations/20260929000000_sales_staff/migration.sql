-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "fitterId" TEXT,
ADD COLUMN     "sellerId" TEXT;

-- CreateTable
CREATE TABLE "sales_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_staff_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sales_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_fitterId_fkey" FOREIGN KEY ("fitterId") REFERENCES "sales_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

