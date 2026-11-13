-- Run once in the production Cloudflare D1 database before accepting registrations with country.
ALTER TABLE event_registrations ADD COLUMN country TEXT;
