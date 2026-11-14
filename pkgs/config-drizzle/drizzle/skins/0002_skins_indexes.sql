-- Skins schema version and the signature indexes used by history joins.
-- Applied by hand after `0001_skins_ownership.sql`.
--
--   mysql "$SKINS_MYSQL_URI" < 0002_skins_indexes.sql

-- `signature` is TEXT, so the indexes are prefixes.
CREATE INDEX IF NOT EXISTS `idx_sr_custom_skins_signature` ON `sr_custom_skins` (`signature`(64));
CREATE INDEX IF NOT EXISTS `idx_sr_url_skins_signature` ON `sr_url_skins` (`signature`(64));

CREATE TABLE IF NOT EXISTS `skin_schema_version` (
	`version` int NOT NULL,
	`applied_at` bigint(20) NOT NULL,
	PRIMARY KEY (`version`)
);

INSERT IGNORE INTO `skin_schema_version` (`version`, `applied_at`) VALUES
	(1, UNIX_TIMESTAMP()),
	(2, UNIX_TIMESTAMP());
