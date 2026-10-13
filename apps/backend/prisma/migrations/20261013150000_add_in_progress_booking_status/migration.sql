-- PostgreSQL requires a newly added enum value to be committed before it is used.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS' AFTER 'CONFIRMED';
