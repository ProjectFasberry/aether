// import { Kysely } from 'kysely';
// import type { DB as sqliteDBType } from "@repo/shared/types/db/sqlite-database-types";
// import { Database } from "bun:sqlite";
// import { BunSqliteDialect } from 'kysely-bun-sqlite';
// import { SQLITE_DATABASE_URL as url } from '../env';

// const database = new Database(url)

// database.run("PRAGMA journal_mode = WAL;");

// export const sqlite = new Kysely<sqliteDBType>({ 
//   dialect: new BunSqliteDialect({ database })
// })