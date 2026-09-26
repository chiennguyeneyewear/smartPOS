-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_branchId_fkey";

-- CreateTable
CREATE TABLE "task_branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_branches_pkey" PRIMARY KEY ("id")
);

-- Start the task branch list from the current branches (same id and name), so tasks already
-- tagged with a branch keep working and CS1/CS2/CS3 are there from the start.
INSERT INTO "task_branches" ("id", "name")
SELECT "id", "name" FROM "branches"
WHERE "isActive" = true OR "id" IN (SELECT "branchId" FROM "tasks" WHERE "branchId" IS NOT NULL);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "task_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
