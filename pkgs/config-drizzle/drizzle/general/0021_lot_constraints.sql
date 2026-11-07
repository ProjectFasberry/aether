-- Lot and allocation invariants at the database level.
--
-- The application already keeps these rules; the checks stop a manual write
-- from creating negative or over-restored lots.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_lots_amount_nonnegative') THEN
    ALTER TABLE "wallet_lots"
      ADD CONSTRAINT "wallet_lots_amount_nonnegative" CHECK ("amount" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_lots_remaining_range') THEN
    ALTER TABLE "wallet_lots"
      ADD CONSTRAINT "wallet_lots_remaining_range" CHECK ("remaining" >= 0 AND "remaining" <= "amount");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lot_allocations_amount_positive') THEN
    ALTER TABLE "lot_allocations"
      ADD CONSTRAINT "lot_allocations_amount_positive" CHECK ("amount" > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lot_allocations_restored_range') THEN
    ALTER TABLE "lot_allocations"
      ADD CONSTRAINT "lot_allocations_restored_range" CHECK ("restored_amount" >= 0 AND "restored_amount" <= "amount");
  END IF;
END $$;
