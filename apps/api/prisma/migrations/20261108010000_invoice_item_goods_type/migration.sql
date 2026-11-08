-- CreateEnum
CREATE TYPE "GoodsType" AS ENUM ('TN', 'CN');

-- AlterTable: existing lines stay NULL ("chưa phân loại")
ALTER TABLE "invoice_items" ADD COLUMN "goodsType" "GoodsType";
