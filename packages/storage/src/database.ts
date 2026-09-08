import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrations = [
  {
    version: 1,
    sql: readFileSync(
      new URL("./migrations/001_phase0.sql", import.meta.url),
      "utf8",
    ),
  },
] as const;

export interface Database {
  readonly path: string;
  readonly connection: DatabaseSync;
  readonly appliedMigrations: () => readonly number[];
  readonly close: () => void;
}

function applyMigrations(connection: DatabaseSync, now: () => string): void {
  connection.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const applied = new Set(
    connection
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((row) => (row as { version: number }).version),
  );
  const record = connection.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }
    connection.exec("BEGIN");
    try {
      connection.exec(migration.sql);
      record.run(migration.version, now());
      connection.exec("COMMIT");
    } catch (error) {
      connection.exec("ROLLBACK");
      throw error;
    }
  }
}

export function openDatabase(
  path: string,
  now: () => string = () => new Date().toISOString(),
): Database {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const connection = new DatabaseSync(path);
  connection.exec("PRAGMA journal_mode = WAL");
  connection.exec("PRAGMA foreign_keys = ON");
  connection.exec("PRAGMA busy_timeout = 5000");
  applyMigrations(connection, now);

  return {
    path,
    connection,
    appliedMigrations: () =>
      connection
        .prepare("SELECT version FROM schema_migrations ORDER BY version")
        .all()
        .map((row) => (row as { version: number }).version),
    close: () => connection.close(),
  };
}
