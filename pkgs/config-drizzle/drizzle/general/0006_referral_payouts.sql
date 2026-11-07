-- Referral payouts (MN-150).
--
-- A pair is rewarded once in charisma only: BELKOIN is purchased and must not
-- have a faucet. `rewarded_at` is the audit flag, `payout_after` delays the
-- payout so an instantly created alt cannot cash out.
--
-- IP/device columns are placeholders: web registration is the only entry that
-- could provide them today, so the anti-fraud check is added later without a
-- schema change.

ALTER TABLE "referrals"
  ADD COLUMN IF NOT EXISTS "rewarded_at" timestamptz;

ALTER TABLE "referrals"
  ADD COLUMN IF NOT EXISTS "payout_after" timestamptz NOT NULL DEFAULT now();

ALTER TABLE "referrals"
  ADD COLUMN IF NOT EXISTS "referrer_ip" inet;

ALTER TABLE "referrals"
  ADD COLUMN IF NOT EXISTS "device" text;

CREATE UNIQUE INDEX IF NOT EXISTS "referrals_pair_uq"
  ON "referrals" ("referrer", "referral");

CREATE INDEX IF NOT EXISTS "referrals_pending_payout_idx"
  ON "referrals" ("payout_after")
  WHERE "rewarded_at" IS NULL;
