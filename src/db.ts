import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const dbPath = resolve(process.cwd(), process.env.DATABASE_URL ?? "./data/app.db");
mkdirSync(dirname(dbPath), { recursive: true });

// `timeout` sets SQLite's busy timeout (ms): when the database file is locked
// by another connection, operations wait and retry for up to this long instead
// of failing immediately with `SQLITE_BUSY` ("database is locked"). This is
// required during `next build`, where the "Collecting page data" phase imports
// this module in several parallel worker processes that each open the same
// file and run the `PRAGMA journal_mode = WAL` write below (which needs a brief
// exclusive lock). Without a busy timeout those concurrent writes race and the
// build fails; the timeout serializes them. It also makes concurrent runtime
// route handlers more robust.
export const db = new DatabaseSync(dbPath, { timeout: 10000 });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
