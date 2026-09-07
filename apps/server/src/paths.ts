import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const LOOPBACK_HOST = "127.0.0.1";
export const DEFAULT_PORT = 47_831;

export interface RuntimePaths {
  readonly appSupportDir: string;
  readonly databasePath: string;
  readonly snapshotsDir: string;
  readonly logDir: string;
  readonly logFile: string;
  readonly webDistDir: string;
}

export interface RuntimeConfig {
  readonly host: typeof LOOPBACK_HOST;
  readonly port: number;
  readonly paths: RuntimePaths;
}

export function resolveRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): RuntimeConfig {
  const appSupportDir =
    env.ELEKTROBRUDI_APP_SUPPORT_DIR ??
    join(home, "Library", "Application Support", "ElektroBrudi");
  const logDir =
    env.ELEKTROBRUDI_LOG_DIR ?? join(home, "Library", "Logs", "ElektroBrudi");
  const webDistDir =
    env.ELEKTROBRUDI_WEB_DIST ??
    resolve(import.meta.dirname, "..", "..", "web", "dist");
  const port = env.ELEKTROBRUDI_PORT
    ? Number.parseInt(env.ELEKTROBRUDI_PORT, 10)
    : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("ELEKTROBRUDI_PORT must be an integer between 0 and 65535");
  }

  return {
    host: LOOPBACK_HOST,
    port,
    paths: {
      appSupportDir,
      databasePath: join(appSupportDir, "data.sqlite"),
      snapshotsDir: join(appSupportDir, "snapshots"),
      logDir,
      logFile: join(logDir, "server.log"),
      webDistDir,
    },
  };
}

export function ensureRuntimeDirectories(paths: RuntimePaths): void {
  for (const directory of [
    paths.appSupportDir,
    paths.snapshotsDir,
    paths.logDir,
  ]) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
}
