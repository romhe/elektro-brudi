import { randomUUID } from "node:crypto";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { DatabaseSync } from "node:sqlite";

interface InsertDefaults {
  readonly id?: () => string;
  readonly now?: () => string;
}

function defaults(input: InsertDefaults): { id: string; createdAt: string } {
  return {
    id: (input.id ?? randomUUID)(),
    createdAt: (input.now ?? (() => new Date().toISOString()))(),
  };
}

export interface RuntimeRecord {
  readonly id: string;
  readonly note: string;
  readonly createdAt: string;
}

export function runtimeRecordRepository(connection: DatabaseSync) {
  const insert = connection.prepare(
    "INSERT INTO runtime_records (id, note, created_at) VALUES (?, ?, ?)",
  );
  const select = connection.prepare(
    "SELECT id, note, created_at AS createdAt FROM runtime_records ORDER BY created_at, id",
  );

  return {
    insert(input: InsertDefaults & { readonly note: string }): RuntimeRecord {
      const note = input.note.trim();
      if (note.length === 0) {
        throw new Error("A record needs a non-empty note");
      }
      const { id, createdAt } = defaults(input);
      insert.run(id, note, createdAt);
      return { id, note, createdAt };
    },
    list(): RuntimeRecord[] {
      return select.all() as unknown as RuntimeRecord[];
    },
  };
}

export type CaptureOutcome = "FETCHED" | "BLOCKED" | "FETCH_FAILED";

export interface CaptureInput {
  readonly requestedUrl: string;
  readonly finalUrl: string | null;
  readonly outcome: CaptureOutcome;
  readonly httpStatus: number | null;
  readonly title: string | null;
  readonly contentBytes: number | null;
  readonly contentSha256: string | null;
  readonly snapshotPath: string | null;
  readonly chromiumVersion: string | null;
  readonly userAgent: string | null;
  readonly durationMs: number;
  readonly error: string | null;
}

export interface Capture extends CaptureInput {
  readonly id: string;
  readonly createdAt: string;
}

export function captureRepository(connection: DatabaseSync) {
  const insert = connection.prepare(
    `INSERT INTO captures (
      id, requested_url, final_url, outcome, http_status, title, content_bytes,
      content_sha256, snapshot_path, chromium_version, user_agent, duration_ms,
      error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const select = connection.prepare(
    `SELECT id, requested_url AS requestedUrl, final_url AS finalUrl, outcome,
      http_status AS httpStatus, title, content_bytes AS contentBytes,
      content_sha256 AS contentSha256, snapshot_path AS snapshotPath,
      chromium_version AS chromiumVersion, user_agent AS userAgent,
      duration_ms AS durationMs, error, created_at AS createdAt
    FROM captures ORDER BY created_at, id`,
  );

  return {
    insert(input: InsertDefaults & CaptureInput): Capture {
      const { id, createdAt } = defaults(input);
      insert.run(
        id,
        input.requestedUrl,
        input.finalUrl,
        input.outcome,
        input.httpStatus,
        input.title,
        input.contentBytes,
        input.contentSha256,
        input.snapshotPath,
        input.chromiumVersion,
        input.userAgent,
        input.durationMs,
        input.error,
        createdAt,
      );
      return {
        id,
        requestedUrl: input.requestedUrl,
        finalUrl: input.finalUrl,
        outcome: input.outcome,
        httpStatus: input.httpStatus,
        title: input.title,
        contentBytes: input.contentBytes,
        contentSha256: input.contentSha256,
        snapshotPath: input.snapshotPath,
        chromiumVersion: input.chromiumVersion,
        userAgent: input.userAgent,
        durationMs: input.durationMs,
        error: input.error,
        createdAt,
      };
    },
    list(): Capture[] {
      return select.all() as unknown as Capture[];
    },
  };
}

export type ModelRunPhase = "LOAD" | "GENERATE";

export interface ModelRunInput {
  readonly browserUserAgent: string;
  readonly modelId: string;
  readonly phase: ModelRunPhase;
  readonly cacheHit: boolean | null;
  readonly webgpuAvailable: boolean;
  readonly durationMs: number;
  readonly outputJson: string | null;
  readonly error: string | null;
}

export interface ModelRun extends ModelRunInput {
  readonly id: string;
  readonly createdAt: string;
}

function toFlag(value: boolean | null): number | null {
  return value === null ? null : value ? 1 : 0;
}

function fromFlag(value: number | null): boolean | null {
  return value === null ? null : value === 1;
}

export function modelRunRepository(connection: DatabaseSync) {
  const insert = connection.prepare(
    `INSERT INTO model_runs (
      id, browser_user_agent, model_id, phase, cache_hit, webgpu_available,
      duration_ms, output_json, error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const select = connection.prepare(
    `SELECT id, browser_user_agent AS browserUserAgent, model_id AS modelId,
      phase, cache_hit AS cacheHit, webgpu_available AS webgpuAvailable,
      duration_ms AS durationMs, output_json AS outputJson, error,
      created_at AS createdAt
    FROM model_runs ORDER BY created_at, id`,
  );

  return {
    insert(input: InsertDefaults & ModelRunInput): ModelRun {
      const { id, createdAt } = defaults(input);
      insert.run(
        id,
        input.browserUserAgent,
        input.modelId,
        input.phase,
        toFlag(input.cacheHit),
        toFlag(input.webgpuAvailable),
        input.durationMs,
        input.outputJson,
        input.error,
        createdAt,
      );
      return {
        id,
        browserUserAgent: input.browserUserAgent,
        modelId: input.modelId,
        phase: input.phase,
        cacheHit: input.cacheHit,
        webgpuAvailable: input.webgpuAvailable,
        durationMs: input.durationMs,
        outputJson: input.outputJson,
        error: input.error,
        createdAt,
      };
    },
    list(): ModelRun[] {
      return (
        select.all() as unknown as (Omit<
          ModelRun,
          "cacheHit" | "webgpuAvailable"
        > & { cacheHit: number | null; webgpuAvailable: number })[]
      ).map((row) => ({
        ...row,
        cacheHit: fromFlag(row.cacheHit),
        webgpuAvailable: row.webgpuAvailable === 1,
      }));
    },
  };
}
