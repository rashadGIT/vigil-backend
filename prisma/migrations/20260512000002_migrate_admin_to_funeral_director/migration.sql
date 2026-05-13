-- Migrate existing 'admin' users to 'funeral_director' and remove the old enum value
-- New values from migration 20260512000001 are committed so they can be used here

-- Migrate data
UPDATE "users" SET "role" = 'funeral_director' WHERE "role" = 'admin';

-- Swap enum to remove the 'admin' value
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('super_admin', 'funeral_director', 'staff');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'staff';

DROP TYPE "UserRole_old";
