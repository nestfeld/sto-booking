-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "login" VARCHAR(32) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "User_login_length_check" CHECK (char_length("login") BETWEEN 3 AND 32),
    CONSTRAINT "User_passwordHash_check" CHECK (char_length("passwordHash") > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
