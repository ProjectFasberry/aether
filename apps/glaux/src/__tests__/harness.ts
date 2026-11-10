import { mock } from "bun:test"

/**
 * Shared mocks for the glaux route tests.
 *
 * Every module that a route touches is replaced before the route or the app is
 * imported: environment, databases, Redis and the GitHub fan-out. Tests change
 * `state` and call the app through `app.handle`.
 */
export type MetricsRow = {
	id?: number
	app: string
	stage: string
	branch: string
	commit_sha: string
	created_at: Date
	client_js_bytes: number | string
	client_css_bytes: number | string
	client_fonts_bytes: number | string
	client_images_bytes: number | string
	client_other_bytes: number | string
	server_js_bytes: number | string
	total_bytes: number | string
}

export const state = {
	env: {} as Record<string, unknown>,
	notifications: [] as unknown[],
	redis: {
		keys: new Set<string>(),
		fail: false,
	},
	metrics: {
		configured: true,
		rows: [] as MetricsRow[],
		inserted: [] as Record<string, unknown>[],
		failInsert: false,
		failSelect: false,
		lastLimit: null as number | null,
		filters: [] as Array<[string, unknown]>,
	},
	logs: [] as unknown[][],
}

export function resetState() {
	state.env = {
		BUILD_METRICS_TOKEN: "metrics-token",
		BUILD_METRICS_POSTGRES_URI: "postgres://test",
		GITHUB_WEBHOOK_SECRET: "webhook-secret",
	}
	state.notifications = []
	state.redis.keys.clear()
	state.redis.fail = false
	state.metrics.configured = true
	state.metrics.rows = []
	state.metrics.inserted = []
	state.metrics.failInsert = false
	state.metrics.failSelect = false
	state.metrics.lastLimit = null
	state.metrics.filters = []
	state.logs = []
}

const metricsSelectBuilder = {
	selectAll: () => metricsSelectBuilder,
	orderBy: () => metricsSelectBuilder,
	limit: (limit: number) => {
		state.metrics.lastLimit = limit
		return metricsSelectBuilder
	},
	where: (column: string, _operator: string, value: unknown) => {
		state.metrics.filters.push([column, value])
		return metricsSelectBuilder
	},
	execute: async () => {
		if (state.metrics.failSelect) throw new Error("select failed")
		return state.metrics.rows
	},
}

const metricsInsertBuilder = {
	values: (values: Record<string, unknown>) => {
		state.metrics.inserted.push(values)
		return {
			onConflict: () => ({
				execute: async () => {
					if (state.metrics.failInsert) throw new Error("insert failed")
					return []
				},
			}),
		}
	},
}

const metricsDb = {
	insertInto: () => metricsInsertBuilder,
	selectFrom: () => metricsSelectBuilder,
}

const generalDb = {
	selectFrom: () => ({
		select: () => ({
			where: () => ({
				executeTakeFirst: async () => undefined,
			}),
		}),
	}),
}

const silent = {
	info: (...args: unknown[]) => state.logs.push(args),
	warn: (...args: unknown[]) => state.logs.push(args),
	error: (...args: unknown[]) => state.logs.push(args),
	debug: (...args: unknown[]) => state.logs.push(args),
	child: () => silent,
}

/**
 * Registers module mocks. Call once, before importing `../app` or a route.
 */
export function installGlauxMocks() {
	mock.module("#/shared/env", () => ({
		getEnv: () => state.env,
		initEnv: () => {},
	}))

	mock.module("#/shared/logger", () => ({
		appLogger: silent,
		logger: silent,
	}))

	mock.module("#/shared/database/general-db", () => ({
		general: generalDb,
		generalPool: {},
	}))

	mock.module("#/shared/database/build-metrics-db", () => ({
		getBuildMetricsDb: () => (state.metrics.configured ? metricsDb : null),
		ensureBuildMetricsTable: async () => {},
	}))

	mock.module("#/shared/redis/client", () => ({
		redis: {
			getInstance: () => ({
				set: async (key: string) => {
					if (state.redis.fail) throw new Error("redis failed")
					if (state.redis.keys.has(key)) return null
					state.redis.keys.add(key)
					return "OK"
				},
			}),
		},
	}))

	mock.module("#/shared/notify/github", () => ({
		sendGithubPush: async (payload: unknown) => {
			state.notifications.push(payload)
		},
		sendGithubWorkflowRun: async (payload: unknown) => {
			state.notifications.push(payload)
		},
	}))
}
