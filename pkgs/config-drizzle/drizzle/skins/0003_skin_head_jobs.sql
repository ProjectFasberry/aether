-- Durable queue for rendered heads. A missing head is enqueued before the
-- inline render; failures stay pending and are retried by the cron job.
--
--   mysql "$SKINS_MYSQL_URI" < 0003_skin_head_jobs.sql

CREATE TABLE IF NOT EXISTS `skin_head_jobs` (
	`hash` varchar(64) NOT NULL,
	`skin_url` text NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`last_error` text DEFAULT NULL,
	`created_at` bigint(20) NOT NULL,
	`updated_at` bigint(20) NOT NULL,
	PRIMARY KEY (`hash`),
	KEY `idx_skin_head_jobs_status` (`status`, `updated_at`)
);

INSERT IGNORE INTO `skin_schema_version` (`version`, `applied_at`) VALUES
	(3, UNIX_TIMESTAMP());
