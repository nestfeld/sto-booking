-- Required for equality checks on integer columns inside GiST exclusion constraints.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateTable
CREATE TABLE "WorkPostType" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPostType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPost" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPostService" (
    "workPostId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,

    CONSTRAINT "WorkPostService_pkey" PRIMARY KEY ("workPostId", "serviceId")
);

-- CreateTable
CREATE TABLE "StationWorkingPeriod" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "startsMinute" INTEGER NOT NULL,
    "endsMinute" INTEGER NOT NULL,

    CONSTRAINT "StationWorkingPeriod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StationWorkingPeriod_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
    CONSTRAINT "StationWorkingPeriod_minutes_check" CHECK (
        "startsMinute" BETWEEN 0 AND 1439
        AND "endsMinute" BETWEEN 1 AND 1440
        AND "startsMinute" < "endsMinute"
    )
);

-- CreateTable
CREATE TABLE "StationScheduleException" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,
    "startsMinute" INTEGER,
    "endsMinute" INTEGER,
    "reason" TEXT,

    CONSTRAINT "StationScheduleException_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StationScheduleException_period_check" CHECK (
        ("isClosed" = true AND "startsMinute" IS NULL AND "endsMinute" IS NULL)
        OR
        (
            "isClosed" = false
            AND "startsMinute" BETWEEN 0 AND 1439
            AND "endsMinute" BETWEEN 1 AND 1440
            AND "startsMinute" < "endsMinute"
        )
    )
);

-- CreateTable
CREATE TABLE "WorkPostDowntime" (
    "id" SERIAL NOT NULL,
    "workPostId" INTEGER NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "WorkPostDowntime_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkPostDowntime_period_check" CHECK ("endsAt" > "startsAt")
);

-- AlterTable
ALTER TABLE "Booking"
    ADD COLUMN "stationId" INTEGER NOT NULL,
    ADD COLUMN "serviceId" INTEGER NOT NULL,
    ADD COLUMN "workPostId" INTEGER NOT NULL,
    ADD COLUMN "endsAt" TIMESTAMPTZ(3) NOT NULL,
    ADD COLUMN "durationMinutes" INTEGER NOT NULL,
    ADD COLUMN "priceAmount" INTEGER,
    ALTER COLUMN "startsAt" TYPE TIMESTAMPTZ(3) USING "startsAt" AT TIME ZONE 'UTC',
    DROP COLUMN "service";

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_period_check" CHECK ("endsAt" > "startsAt"),
    ADD CONSTRAINT "Booking_durationMinutes_check" CHECK ("durationMinutes" > 0),
    ADD CONSTRAINT "Booking_priceAmount_check" CHECK ("priceAmount" IS NULL OR "priceAmount" >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "WorkPostType_slug_key" ON "WorkPostType"("slug");
CREATE INDEX "WorkPostType_isActive_idx" ON "WorkPostType"("isActive");

CREATE UNIQUE INDEX "WorkPost_stationId_code_key" ON "WorkPost"("stationId", "code");
CREATE UNIQUE INDEX "WorkPost_id_stationId_key" ON "WorkPost"("id", "stationId");
CREATE INDEX "WorkPost_stationId_isActive_idx" ON "WorkPost"("stationId", "isActive");
CREATE INDEX "WorkPost_typeId_isActive_idx" ON "WorkPost"("typeId", "isActive");

CREATE UNIQUE INDEX "WorkPostService_workPostId_stationId_serviceId_key"
    ON "WorkPostService"("workPostId", "stationId", "serviceId");
CREATE INDEX "WorkPostService_stationId_serviceId_idx"
    ON "WorkPostService"("stationId", "serviceId");

CREATE UNIQUE INDEX "StationWorkingPeriod_stationId_weekday_startsMinute_endsMi_key"
    ON "StationWorkingPeriod"("stationId", "weekday", "startsMinute", "endsMinute");
CREATE INDEX "StationWorkingPeriod_stationId_weekday_idx"
    ON "StationWorkingPeriod"("stationId", "weekday");

CREATE UNIQUE INDEX "StationScheduleException_stationId_date_key"
    ON "StationScheduleException"("stationId", "date");

CREATE INDEX "WorkPostDowntime_workPostId_startsAt_endsAt_idx"
    ON "WorkPostDowntime"("workPostId", "startsAt", "endsAt");

CREATE INDEX "Booking_stationId_startsAt_idx" ON "Booking"("stationId", "startsAt");
CREATE INDEX "Booking_serviceId_startsAt_idx" ON "Booking"("serviceId", "startsAt");
CREATE INDEX "Booking_workPostId_startsAt_idx" ON "Booking"("workPostId", "startsAt");
CREATE INDEX "Booking_status_startsAt_idx" ON "Booking"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "WorkPost"
    ADD CONSTRAINT "WorkPost_stationId_fkey"
    FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkPost"
    ADD CONSTRAINT "WorkPost_typeId_fkey"
    FOREIGN KEY ("typeId") REFERENCES "WorkPostType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkPostService"
    ADD CONSTRAINT "WorkPostService_workPostId_stationId_fkey"
    FOREIGN KEY ("workPostId", "stationId") REFERENCES "WorkPost"("id", "stationId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkPostService"
    ADD CONSTRAINT "WorkPostService_stationId_serviceId_fkey"
    FOREIGN KEY ("stationId", "serviceId") REFERENCES "StationService"("stationId", "serviceId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StationWorkingPeriod"
    ADD CONSTRAINT "StationWorkingPeriod_stationId_fkey"
    FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StationScheduleException"
    ADD CONSTRAINT "StationScheduleException_stationId_fkey"
    FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkPostDowntime"
    ADD CONSTRAINT "WorkPostDowntime_workPostId_fkey"
    FOREIGN KEY ("workPostId") REFERENCES "WorkPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_workPostId_stationId_serviceId_fkey"
    FOREIGN KEY ("workPostId", "stationId", "serviceId")
    REFERENCES "WorkPostService"("workPostId", "stationId", "serviceId")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prevent overlapping active bookings for the same post. Adjacent intervals are allowed.
ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_workPost_time_excl"
    EXCLUDE USING gist (
        "workPostId" WITH =,
        tstzrange("startsAt", "endsAt", '[)') WITH &&
    )
    WHERE (
        "status" IN (
            'PENDING'::"BookingStatus",
            'CONFIRMED'::"BookingStatus",
            'IN_PROGRESS'::"BookingStatus"
        )
    );
