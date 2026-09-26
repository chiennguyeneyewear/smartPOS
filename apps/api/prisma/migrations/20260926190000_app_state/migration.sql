-- CreateTable
CREATE TABLE "app_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "deployVersion" TEXT NOT NULL DEFAULT '',
    "changeEpoch" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "app_state_pkey" PRIMARY KEY ("id")
);
