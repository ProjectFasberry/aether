import { mock } from "bun:test";
import {
	DummyDriver,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
} from "kysely";

/**
 * A Kysely instance backed by `DummyDriver`: every query succeeds and returns
 * no rows. It lets the data modules load and run their validation/idempotency
 * branches without a database.
 */
export function dummyDb(): Kysely<Record<string, never>> {
	return new Kysely<Record<string, never>>({
		dialect: {
			createAdapter: () => new PostgresAdapter(),
			createDriver: () => new DummyDriver(),
			createIntrospector: (db) => new PostgresIntrospector(db),
			createQueryCompiler: () => new PostgresQueryCompiler(),
		},
	});
}

/**
 * Replaces the three business databases and the helpers with side effects
 * (Redis lock, error logging). Call before importing a data module.
 */
export function installDatabaseMocks(): void {
	mock.module("#/shared/database/general-db", () => ({
		general: dummyDb(),
		generalPool: {},
	}));
	mock.module("#/shared/database/playerpoints-db", () => ({
		playerpoints: dummyDb(),
		playerPointsPool: {},
	}));
	mock.module("#/shared/database/bisquite-db", () => ({
		bisquite: dummyDb(),
		bisquitePool: {},
	}));
	mock.module("#/shared/redis/lock", () => ({
		withRedisLock: async (
			_key: string,
			_ttl: number,
			fn: () => Promise<unknown>,
		) => fn(),
	}));
	mock.module("#/shared/observability/log", () => ({
		logErrorMsg: () => {},
	}));
}

export type PublishedMessage = { subject: string; data: string };

/** Replaces the NATS client and records published messages. */
export function installNatsMock(published: PublishedMessage[]): void {
	mock.module("#/shared/nats/client", () => ({
		natsService: {
			getInstance: () => ({
				publish: (subject: string, data: string) => {
					published.push({ subject, data });
				},
			}),
		},
	}));
}
