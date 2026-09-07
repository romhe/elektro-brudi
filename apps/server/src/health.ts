// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { BrowserDescription } from "@elektro-brudi/browser";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { Database } from "@elektro-brudi/storage";

export interface HealthReport {
  readonly status: "ok";
  readonly version: string;
  readonly pid: number;
  readonly startedAt: string;
  readonly uptimeMs: number;
  readonly listen: { readonly host: string; readonly port: number };
  readonly database: {
    readonly status: "OK";
    readonly path: string;
    readonly migrations: readonly number[];
  };
  readonly browser:
    | { readonly status: "AVAILABLE"; readonly chromiumVersion: string }
    | { readonly status: "MISSING"; readonly error: string };
}

export function buildHealthReport(input: {
  readonly version: string;
  readonly startedAt: Date;
  readonly now: Date;
  readonly host: string;
  readonly port: number;
  readonly database: Database;
  readonly describeBrowser: () => BrowserDescription;
}): HealthReport {
  let browser: HealthReport["browser"];
  try {
    browser = {
      status: "AVAILABLE",
      chromiumVersion: input.describeBrowser().chromiumVersion,
    };
  } catch (error) {
    browser = {
      status: "MISSING",
      error: error instanceof Error ? error.message : "Browser check failed",
    };
  }

  return {
    status: "ok",
    version: input.version,
    pid: process.pid,
    startedAt: input.startedAt.toISOString(),
    uptimeMs: Math.max(0, input.now.getTime() - input.startedAt.getTime()),
    listen: { host: input.host, port: input.port },
    database: {
      status: "OK",
      path: input.database.path,
      migrations: input.database.appliedMigrations(),
    },
    browser,
  };
}
