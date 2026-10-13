-- Bookings remain available to guests, but authenticated clients can own them.
ALTER TABLE "Booking" ADD COLUMN "userId" INTEGER;

CREATE INDEX "Booking_userId_startsAt_idx" ON "Booking"("userId", "startsAt");

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
