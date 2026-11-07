-- Drop the pre-ledger external payments table after keeping a copy.
--
-- It has no readers in the current code base; orders/payment_events are the
-- supported tables. The copy is empty in production but preserves any rows in
-- older environments.

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "payments_legacy_20261107" AS
      SELECT * FROM "payments";

    DROP TABLE "payments";
  END IF;
END $$;
