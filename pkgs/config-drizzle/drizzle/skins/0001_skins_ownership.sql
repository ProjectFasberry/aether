-- Custom skin ownership and audit. Applied by hand after the introspected
-- baseline (`0000`); additive and safe to retry.
--
--   mysql "$SKINS_MYSQL_URI" < 0001_skins_ownership.sql

CREATE TABLE IF NOT EXISTS `skin_owners` (
	`skin_name` varchar(36) NOT NULL,
	`owner_uuid` varchar(36) NOT NULL,
	`is_public` tinyint(1) NOT NULL DEFAULT 0,
	`created_at` bigint(20) NOT NULL,
	PRIMARY KEY (`skin_name`),
	KEY `idx_skin_owners_owner` (`owner_uuid`)
);

CREATE TABLE IF NOT EXISTS `skin_audit` (
	`id` bigint(20) NOT NULL AUTO_INCREMENT,
	`actor_uuid` varchar(36) NOT NULL,
	`target_uuid` varchar(36) DEFAULT NULL,
	`action` varchar(16) NOT NULL,
	`skin_name` varchar(36) NOT NULL,
	`created_at` bigint(20) NOT NULL,
	PRIMARY KEY (`id`),
	KEY `idx_skin_audit_skin` (`skin_name`),
	KEY `idx_skin_audit_actor` (`actor_uuid`, `created_at`)
);
