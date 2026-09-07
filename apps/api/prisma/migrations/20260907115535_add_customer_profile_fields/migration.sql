-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "ward" TEXT;
