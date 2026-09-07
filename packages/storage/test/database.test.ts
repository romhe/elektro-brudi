import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../src/database.js";
import {
  captureRepository,
  modelRunRepository,
  runtimeRecordRepository,
} from "../src/repositories.js";

let directory: string;
let databasePath: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "elektro-brudi-storage-"));
  databasePath = join(directory, "data.sqlite");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("openDatabase", () => {
  it("applies the Phase 0 migration once and stays idempotent", () => {
    const first = openDatabase(databasePath);
    expect(first.appliedMigrations()).toEqual([1]);
    first.close();

    const second = openDatabase(databasePath);
    expect(second.appliedMigrations()).toEqual([1]);
    const tables = second.connection
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual([
      "captures",
      "model_runs",
      "runtime_records",
      "schema_migrations",
    ]);
    second.close();
  });

  it("enables WAL, foreign keys, and a busy timeout", () => {
    const database = openDatabase(databasePath);
    const pragma = (name: string) =>
      Object.values(
        database.connection.prepare(`PRAGMA ${name}`).get() as Record<
          string,
          unknown
        >,
      )[0];

    expect(pragma("journal_mode")).toBe("wal");
    expect(pragma("foreign_keys")).toBe(1);
    expect(pragma("busy_timeout")).toBe(5_000);
    database.close();
  });

  it("creates the parent directory of the database file", () => {
    const nested = join(directory, "nested", "deeper", "data.sqlite");
    const database = openDatabase(nested);
    expect(database.path).toBe(nested);
    database.close();
  });
});

describe("runtimeRecordRepository", () => {
  it("persists records across close and reopen", () => {
    const database = openDatabase(databasePath);
    const record = runtimeRecordRepository(database.connection).insert({
      note: "double-click proof",
      now: () => "2026-09-07T10:00:00.000Z",
      id: () => "record-1",
    });
    database.close();

    const reopened = openDatabase(databasePath);
    expect(runtimeRecordRepository(reopened.connection).list()).toEqual([
      record,
    ]);
    expect(record).toEqual({
      id: "record-1",
      note: "double-click proof",
      createdAt: "2026-09-07T10:00:00.000Z",
    });
    reopened.close();
  });

  it("rejects an empty note", () => {
    const database = openDatabase(databasePath);
    expect(() =>
      runtimeRecordRepository(database.connection).insert({ note: "   " }),
    ).toThrow("A record needs a non-empty note");
    database.close();
  });
});

describe("captureRepository", () => {
  it("stores capture metadata without page content", () => {
    const database = openDatabase(databasePath);
    const repository = captureRepository(database.connection);
    const capture = repository.insert({
      id: () => "capture-1",
      now: () => "2026-09-07T10:01:00.000Z",
      requestedUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      outcome: "FETCHED",
      httpStatus: 200,
      title: "Example Domain",
      contentBytes: 1_256,
      contentSha256: "a".repeat(64),
      snapshotPath: "/tmp/snapshots/capture-1.txt",
      chromiumVersion: "153.0.8010.12",
      userAgent: "Mozilla/5.0 Chrome/153.0.0.0",
      durationMs: 1_432,
      error: null,
    });

    expect(repository.list()).toEqual([capture]);
    expect(capture.createdAt).toBe("2026-09-07T10:01:00.000Z");
    expect(capture).not.toHaveProperty("bodyText");
    database.close();
  });

  it("rejects an unknown outcome", () => {
    const database = openDatabase(databasePath);
    expect(() =>
      captureRepository(database.connection).insert({
        requestedUrl: "https://example.com/",
        finalUrl: null,
        outcome: "SOLD" as never,
        httpStatus: null,
        title: null,
        contentBytes: null,
        contentSha256: null,
        snapshotPath: null,
        chromiumVersion: null,
        userAgent: null,
        durationMs: 5,
        error: "unsupported",
      }),
    ).toThrow(/CHECK constraint failed/u);
    database.close();
  });
});

describe("modelRunRepository", () => {
  it("stores load and generation measurements", () => {
    const database = openDatabase(databasePath);
    const repository = modelRunRepository(database.connection);
    const load = repository.insert({
      id: () => "run-1",
      now: () => "2026-09-07T10:02:00.000Z",
      browserUserAgent: "Mozilla/5.0 Safari/605.1.15",
      modelId: "Qwen3-1.7B-q4f16_1-MLC",
      phase: "LOAD",
      cacheHit: false,
      webgpuAvailable: true,
      durationMs: 45_000,
      outputJson: null,
      error: null,
    });
    const generate = repository.insert({
      browserUserAgent: "Mozilla/5.0 Safari/605.1.15",
      modelId: "Qwen3-1.7B-q4f16_1-MLC",
      phase: "GENERATE",
      cacheHit: null,
      webgpuAvailable: true,
      durationMs: 900,
      outputJson: '{"ok":true}',
      error: null,
    });

    expect(repository.list()).toEqual([load, generate]);
    expect(load.cacheHit).toBe(false);
    expect(generate.cacheHit).toBeNull();
    expect(generate.outputJson).toBe('{"ok":true}');
    database.close();
  });
});
