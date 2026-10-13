CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ADMIN');

ALTER TABLE "User"
    ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CLIENT';

CREATE INDEX "User_role_idx" ON "User"("role");
