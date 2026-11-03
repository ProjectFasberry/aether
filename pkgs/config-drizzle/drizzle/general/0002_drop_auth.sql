-- The LimboAuth compatibility table is gone: the API, the launcher and the
-- proxy all authenticate against `accounts` / `account_credentials`, and the
-- dual-write was removed in 086b1fd and deployed on 2026-11-03.
--
-- Idempotent on purpose: it runs once per environment (dev, prod) and is safe to
-- re-run.

DROP TABLE IF EXISTS "AUTH";
