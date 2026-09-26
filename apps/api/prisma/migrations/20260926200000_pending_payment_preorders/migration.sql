-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CONFIRMED', 'PENDING');

-- CreateEnum
CREATE TYPE "PreorderStatus" AS ENUM ('DEPOSITED', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "depositAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paymentConfirmedById" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "preorderId" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "reference" TEXT;

-- CreateTable
CREATE TABLE "invoice_payment_logs" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preorders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "PreorderStatus" NOT NULL DEFAULT 'DEPOSITED',
    "note" TEXT,
    "prescription" TEXT,
    "subTotal" DECIMAL(14,2) NOT NULL,
    "depositAmount" DECIMAL(14,2) NOT NULL,
    "depositMethod" "PaymentMethod",
    "depositReference" TEXT,
    "depositConfirmedAt" TIMESTAMP(3),
    "depositConfirmedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "refundAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "preorders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preorder_items" (
    "id" TEXT NOT NULL,
    "preorderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "preorder_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_payment_logs_invoiceId_idx" ON "invoice_payment_logs"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "preorders_code_key" ON "preorders"("code");

-- CreateIndex
CREATE INDEX "preorders_status_idx" ON "preorders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_preorderId_key" ON "invoices"("preorderId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_preorderId_fkey" FOREIGN KEY ("preorderId") REFERENCES "preorders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payment_logs" ADD CONSTRAINT "invoice_payment_logs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorders" ADD CONSTRAINT "preorders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorders" ADD CONSTRAINT "preorders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorder_items" ADD CONSTRAINT "preorder_items_preorderId_fkey" FOREIGN KEY ("preorderId") REFERENCES "preorders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorder_items" ADD CONSTRAINT "preorder_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

