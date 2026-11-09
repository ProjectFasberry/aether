import { Kysely, PostgresDialect, sql, type Generated } from "kysely"
import { Pool } from "pg"
import { getEnv } from "../env"

export interface BuildMetricsDB {
	build_metrics: {
		id: Generated<number>
		app: string
		stage: string
		branch: string
		commit_sha: string
		created_at: Generated<Date>
		client_js_bytes: number
		client_css_bytes: number
		client_fonts_bytes: number
		client_images_bytes: number
		client_other_bytes: number
		server_js_bytes: number
		total_bytes: number
	}
}

let database: Kysely<BuildMetricsDB> | null = null

export function getBuildMetricsDb(): Kysely<BuildMetricsDB> | null {
	const uri = getEnv().BUILD_METRICS_POSTGRES_URI
	if (!uri) return null

	database ??= new Kysely<BuildMetricsDB>({
		dialect: new PostgresDialect({
			pool: new Pool({ connectionString: uri, max: 5 }),
		}),
	})

	return database
}

/** Creates the metrics table on first boot; the database itself is provisioned by infra. */
export async function ensureBuildMetricsTable(): Promise<void> {
	const db = getBuildMetricsDb()
	if (!db) return

	await sql`
		CREATE TABLE IF NOT EXISTS build_metrics (
			id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
			app text NOT NULL,
			stage text NOT NULL,
			branch text NOT NULL,
			commit_sha text NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			client_js_bytes bigint NOT NULL DEFAULT 0,
			client_css_bytes bigint NOT NULL DEFAULT 0,
			client_fonts_bytes bigint NOT NULL DEFAULT 0,
			client_images_bytes bigint NOT NULL DEFAULT 0,
			client_other_bytes bigint NOT NULL DEFAULT 0,
			server_js_bytes bigint NOT NULL DEFAULT 0,
			total_bytes bigint NOT NULL DEFAULT 0,
			UNIQUE (app, stage, branch, commit_sha)
		)
	`.execute(db)

	await sql`
		CREATE INDEX IF NOT EXISTS build_metrics_app_created_idx
		ON build_metrics (app, created_at DESC)
	`.execute(db)
}
