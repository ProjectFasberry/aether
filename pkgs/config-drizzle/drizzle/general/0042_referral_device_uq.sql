-- A single browser accepting several referrals is the cheapest alt-account
-- farm. The fingerprint is optional (FingerprintJS can fail or be blocked), so
-- the index is partial. IPs are recorded for review but stay non-unique: NAT
-- and shared devices would block legitimate referrals.
--
-- Idempotent: safe to re-run.

CREATE UNIQUE INDEX IF NOT EXISTS "referrals_device_uq"
  ON "referrals" ("device")
  WHERE "device" IS NOT NULL;
