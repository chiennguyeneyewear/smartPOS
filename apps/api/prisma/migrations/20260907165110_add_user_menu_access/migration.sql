-- AlterTable
ALTER TABLE "users" ADD COLUMN     "menuAccess" TEXT[] DEFAULT ARRAY[]::TEXT[];
