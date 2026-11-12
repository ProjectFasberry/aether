import {
	DummyDriver,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
	type CompiledQuery,
	type DatabaseConnection,
	type QueryResult,
} from "kysely";

/**
 * Test doubles for the auth end-to-end suite.
 *
 * Every external dependency (Postgres, Redis, NATS, MinIO) is replaced with an
 * in-memory implementation that keeps the real query/session/route code in the
 * test. The fake driver answers the SQL the auth module actually emits and,
 * like `pg`, reports the affected-row count as a `bigint`.
 */

export type FakeAccount = {
	id: number;
	nickname: string;
	uuid: string;
	lower_nickname: string;
	password_hash: string | null;
};

export type FakeDatabaseState = {
	accounts: FakeAccount[];
	players: { nickname: string; uuid: string; created_at: Date }[];
	findout: { nickname: string; value: string }[];
	referrals: { referrer: string; referral: string }[];
	options: Map<string, boolean>;
};

const INSERT = /^insert into "([a-z_]+)"/;

class FakeConnection implements DatabaseConnection {
	constructor(private readonly state: FakeDatabaseState) {}

	async executeQuery<R>(query: CompiledQuery): Promise<QueryResult<R>> {
		const sql = query.sql.toLowerCase();
		const params = query.parameters as unknown[];

		const inserted = this.insert(sql, params);
		if (inserted) return { rows: inserted as R[], numAffectedRows: 1n };

		const updated = this.update(sql, params);
		if (updated) return { rows: updated as R[], numAffectedRows: 1n };

		return { rows: this.select(sql, params) as R[] };
	}

	// The auth module never streams; a query that does is a test bug.
	async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
		throw new Error("streaming is not supported by the fake driver");
	}

	private insert(sql: string, params: unknown[]): unknown[] | null {
		const table = INSERT.exec(sql)?.[1];
		if (!table) return null;

		switch (table) {
			case "accounts": {
				const [uuid, nickname, lower] = params as string[];
				const account: FakeAccount = {
					id: this.state.accounts.length + 1,
					uuid,
					nickname,
					lower_nickname: lower,
					password_hash: null,
				};
				this.state.accounts.push(account);
				return [{ id: account.id }];
			}
			case "account_credentials": {
				const [accountId, hash] = params as [number, string];
				const account = this.state.accounts.find((row) => row.id === Number(accountId));
				if (account) account.password_hash = hash;
				return [];
			}
			case "players": {
				const [nickname, , uuid] = params as string[];
				const player = { nickname, uuid, created_at: new Date() };
				this.state.players.push(player);
				return [{ nickname: player.nickname, created_at: player.created_at }];
			}
			case "findout": {
				const [nickname, value] = params as string[];
				this.state.findout.push({ nickname, value });
				return [];
			}
			case "referrals": {
				const [referrer, referral] = params as string[];
				this.state.referrals.push({ referrer, referral });
				return [];
			}
			default:
				return [];
		}
	}

	private select(sql: string, params: unknown[]): unknown[] {
		if (sql.includes('from "options"')) {
			const value = this.state.options.get(String(params[0]));
			return value === undefined ? [] : [{ value }];
		}

		// Canonical account lookup joins credentials for the password hash.
		if (sql.includes('inner join "account_credentials"')) {
			const account = this.findByIdentifier(params[0]);
			if (!account?.password_hash) return [];

			return [{
				id: account.id,
				nickname: account.nickname,
				uuid: account.uuid,
				hash: account.password_hash,
			}];
		}

		if (sql.includes('from "accounts"')) {
			const account = this.findByIdentifier(params[0]);
			return account ? [{ nickname: account.nickname, uuid: account.uuid }] : [];
		}

		if (sql.includes('from "players"') && sql.includes('"nickname" =')) {
			return this.state.players.filter((row) => row.nickname === params[0]);
		}

		if (sql.includes('from "referrals"')) {
			return this.state.referrals.filter((row) => row.referrer === params[0]);
		}

		return [];
	}

	private update(sql: string, params: unknown[]): unknown[] | null {
		if (!sql.startsWith('update "options"')) return null;

		const [value, name] = params as [boolean, string];
		this.state.options.set(name, value);
		return [{ value }];
	}

	private findByIdentifier(value: unknown): FakeAccount | undefined {
		const nickname = String(value ?? "").toLowerCase();
		return this.state.accounts.find((row) => row.lower_nickname === nickname);
	}
}

class FakeDriver extends DummyDriver {
	constructor(private readonly state: FakeDatabaseState) {
		super();
	}

	async acquireConnection(): Promise<DatabaseConnection> {
		return new FakeConnection(this.state);
	}
}

export function createFakeGeneral() {
	const state: FakeDatabaseState = {
		accounts: [],
		players: [],
		findout: [],
		referrals: [],
		options: new Map([
			["registrationEnabled", true],
			["botCheckEnabled", false],
			["eventsLogging", false],
		]),
	};

	const db = new Kysely<Record<string, never>>({
		dialect: {
			createAdapter: () => new PostgresAdapter(),
			createDriver: () => new FakeDriver(state),
			createIntrospector: (instance) => new PostgresIntrospector(instance),
			createQueryCompiler: () => new PostgresQueryCompiler(),
		},
	});

	return { db, state };
}

type MultiResult = [Error | null, unknown];

/** The subset of ioredis the auth module uses. */
export class MemoryRedis {
	readonly strings = new Map<string, string>();
	readonly zsets = new Map<string, Map<string, number>>();

	async get(key: string): Promise<string | null> {
		return this.strings.get(key) ?? null;
	}

	async set(key: string, value: string): Promise<"OK"> {
		this.strings.set(key, String(value));
		return "OK";
	}

	async del(...keys: string[]): Promise<number> {
		let removed = 0;
		for (const key of keys.flat()) {
			if (this.strings.delete(key)) removed += 1;
			if (this.zsets.delete(key)) removed += 1;
		}
		return removed;
	}

	async mget(keys: string[]): Promise<(string | null)[]> {
		return keys.map((key) => this.strings.get(key) ?? null);
	}

	async incr(key: string): Promise<number> {
		const next = Number(this.strings.get(key) ?? 0) + 1;
		this.strings.set(key, String(next));
		return next;
	}

	async expire(): Promise<number> {
		return 1;
	}

	async pexpireat(): Promise<number> {
		return 1;
	}

	async pttl(key: string): Promise<number> {
		// A negative value means "no session" for `updateSession`.
		const exists = this.strings.has(key) || this.zsets.has(key);
		return exists ? 30 * 24 * 60 * 60 * 1000 : -2;
	}

	async rpush(key: string, ...values: string[]): Promise<number> {
		this.strings.set(key, [...(this.strings.get(key) ?? ""), ...values].join(""));
		return values.length;
	}

	async zadd(key: string, score: number, member: string): Promise<number> {
		const set = this.zsets.get(key) ?? new Map<string, number>();
		const added = set.has(member) ? 0 : 1;
		set.set(member, Number(score));
		this.zsets.set(key, set);
		return added;
	}

	async zrem(key: string, ...members: string[]): Promise<number> {
		const set = this.zsets.get(key);
		if (!set) return 0;

		let removed = 0;
		for (const member of members.flat()) {
			if (set.delete(member)) removed += 1;
		}
		return removed;
	}

	async zcard(key: string): Promise<number> {
		return this.zsets.get(key)?.size ?? 0;
	}

	async zscore(key: string, member: string): Promise<string | null> {
		const score = this.zsets.get(key)?.get(member);
		return score === undefined ? null : String(score);
	}

	async zrange(key: string, start: number, stop: number): Promise<string[]> {
		const members = [...(this.zsets.get(key) ?? new Map<string, number>())]
			.sort(([, left], [, right]) => left - right)
			.map(([member]) => member);

		const end = stop < 0 ? members.length + stop + 1 : stop + 1;
		return members.slice(start, end);
	}

	multi(): MemoryMulti {
		return new MemoryMulti(this);
	}
}

/** Chainable stand-in for `ioredis`'s pipeline: every command runs at `exec`. */
class MemoryMulti {
	private readonly results: MultiResult[] = [];

	constructor(private readonly redis: MemoryRedis) {}

	set(key: string, value: string): this {
		this.redis.strings.set(key, String(value));
		this.results.push([null, "OK"]);
		return this;
	}

	del(...keys: string[]): this {
		let removed = 0;
		for (const key of keys.flat()) {
			if (this.redis.strings.delete(key)) removed += 1;
			if (this.redis.zsets.delete(key)) removed += 1;
		}
		this.results.push([null, removed]);
		return this;
	}

	pexpireat(): this {
		this.results.push([null, 1]);
		return this;
	}

	expire(): this {
		this.results.push([null, 1]);
		return this;
	}

	zadd(key: string, score: number, member: string): this {
		const set = this.redis.zsets.get(key) ?? new Map<string, number>();
		set.set(member, Number(score));
		this.redis.zsets.set(key, set);
		this.results.push([null, 1]);
		return this;
	}

	zrem(key: string, ...members: string[]): this {
		const set = this.redis.zsets.get(key);
		let removed = 0;
		for (const member of members.flat()) {
			if (set?.delete(member)) removed += 1;
		}
		this.results.push([null, removed]);
		return this;
	}

	get(key: string): this {
		this.results.push([null, this.redis.strings.get(key) ?? null]);
		return this;
	}

	pttl(): this {
		this.results.push([null, 1_000]);
		return this;
	}

	async exec(): Promise<MultiResult[]> {
		return this.results;
	}
}
