-- CreateEnum
CREATE TYPE "EmployeeKind" AS ENUM ('ASSIGNER', 'ASSIGNEE');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "kind" "EmployeeKind" NOT NULL DEFAULT 'ASSIGNEE';

-- Anyone already used as the giver of a task belongs in the assigner list.
UPDATE "employees" SET "kind" = 'ASSIGNER' WHERE "id" IN (SELECT "assignerId" FROM "tasks");
