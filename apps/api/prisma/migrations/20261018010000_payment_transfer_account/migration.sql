-- CreateEnum
CREATE TYPE "TransferAccount" AS ENUM ('PERSONAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "transferAccount" "TransferAccount";
