ALTER TABLE "User"
ADD COLUMN "name" VARCHAR(80),
ADD COLUMN "phone" VARCHAR(24);

UPDATE "User"
SET
  "name" = "login",
  "phone" = 'Не указан';

ALTER TABLE "User"
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

CREATE TABLE "Vehicle" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Booking" ADD COLUMN "vehicleId" INTEGER;

CREATE UNIQUE INDEX "Vehicle_userId_name_key" ON "Vehicle"("userId", "name");
CREATE INDEX "Vehicle_userId_createdAt_idx" ON "Vehicle"("userId", "createdAt");
CREATE INDEX "Booking_vehicleId_idx" ON "Booking"("vehicleId");

ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
