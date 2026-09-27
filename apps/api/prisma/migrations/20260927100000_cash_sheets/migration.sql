-- CreateTable
CREATE TABLE "cash_sheets" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_sheets_date_idx" ON "cash_sheets"("date");

