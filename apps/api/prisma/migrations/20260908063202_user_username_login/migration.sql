-- Switch login identity from email to a dedicated username.
-- Existing "fullName" values already double as simple handles for cashier
-- accounts (CS1, CS2, ...), so they carry over as-is; only the admin account
-- gets a proper short username instead of its Vietnamese display name.
ALTER TABLE "users" RENAME COLUMN "fullName" TO "username";

UPDATE "users" SET "username" = 'admin' WHERE "email" = 'admin@smartpos.vn';

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
