-- Exchange-rate history is append-only.
--
-- Deleting a rate now inserts a disabled history row instead of removing the
-- old one, so the panel can still explain past conversions.

ALTER TABLE "exchange_rates"
  ADD COLUMN IF NOT EXISTS "disabled" boolean NOT NULL DEFAULT false;
