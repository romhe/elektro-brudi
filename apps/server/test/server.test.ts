import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "@elektro-brudi/storage";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { Database } from "@elektro-brudi/storage";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRuntimeConfig } from "../src/paths.js";
import { buildServer } from "../src/server.js";

const identity = {
  browserVersion: "153.0.8010.12",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
  platform: "MacIntel",
  vendor: "Google Inc.",
  language: "de-DE",
  languages: ["de-DE"],
  webdriver: false,
  brands: ["Chromium", "Google Chrome"],
  mobile: false,
  uaPlatform: "macOS",
} as const;

function fakeSession(options: {
  readonly httpStatus?: number | null;
  readonly bodyText?: string;
  readonly fail?: Error;
}) {
  const session = {
    navigate: vi.fn(async () => {
      if (options.fail) {
        throw options.fail;
      }
      return { httpStatus: options.httpStatus ?? 200 };
    }),
    title: vi.fn(async () => "Example Domain"),
    bodyText: vi.fn(
      async () => options.bodyText ?? "Example Domain\nThis domain is for use",
    ),
    identity: vi.fn(async () => identity),
    finalUrl: vi.fn(() => "https://example.com/"),
    close: vi.fn(async () => undefined),
  };
  return session;
}

let directory: string;
let database: Database;
let app: FastifyInstance;
let session: ReturnType<typeof fakeSession>;
let describeBrowser: () => { executablePath: string; chromiumVersion: string };

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "elektro-brudi-server-"));
  const webDist = join(directory, "web-dist");
  await mkdir(webDist, { recursive: true });
  await writeFile(
    join(webDist, "index.html"),
    "<!doctype html><title>PWA</title>",
  );
  await writeFile(join(webDist, "app.js"), "console.log('app')");
  const config = resolveRuntimeConfig(
    {
      ELEKTROBRUDI_APP_SUPPORT_DIR: join(directory, "support"),
      ELEKTROBRUDI_LOG_DIR: join(directory, "logs"),
      ELEKTROBRUDI_WEB_DIST: webDist,
      ELEKTROBRUDI_PORT: "0",
    },
    directory,
  );
  await mkdir(config.paths.snapshotsDir, { recursive: true });
  database = openDatabase(config.paths.databasePath);
  session = fakeSession({});
  describeBrowser = vi.fn(() => ({
    executablePath: "/bundle/chrome",
    chromiumVersion: "153.0.8010.12",
  }));
  app = buildServer({
    config,
    database,
    createSession: async () => session,
    describeBrowser: () => describeBrowser(),
    resolveTarget: async (url) => {
      if (new URL(url).hostname === "internal.example") {
        throw new Error(
          "The hostname resolves to a private or loopback address",
        );
      }
      return new URL(url);
    },
    now: () => new Date("2026-09-07T12:00:00.000Z"),
  });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  database.close();
  await rm(directory, { recursive: true, force: true });
});

describe("GET /api/health", () => {
  it("reports server, database, and browser state without secrets or paths to the binary", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      status: "ok",
      version: "0.0.0",
      listen: { host: "127.0.0.1", port: 0 },
      database: { status: "OK", migrations: [1] },
      browser: { status: "AVAILABLE", chromiumVersion: "153.0.8010.12" },
    });
    expect(body.startedAt).toBe("2026-09-07T12:00:00.000Z");
    expect(JSON.stringify(body)).not.toContain("/bundle/chrome");
  });

  it("reports a missing browser without failing the health check", async () => {
    describeBrowser = () => {
      throw new Error("The project browser binary is not installed");
    };

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json().browser).toEqual({
      status: "MISSING",
      error: "The project browser binary is not installed",
    });
  });
});

describe("/api/records", () => {
  it("creates and lists records", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/records",
      payload: { note: "restart proof" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ note: "restart proof" });

    const listed = await app.inject({ method: "GET", url: "/api/records" });
    expect(listed.json().records).toEqual([created.json()]);
  });

  it("rejects an empty note with a structured error", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/records",
      payload: { note: "  " },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_FAILED");
    expect(response.json()).not.toHaveProperty("stack");
  });
});

describe("/api/captures", () => {
  it("captures a public page, stores metadata, writes the snapshot, and closes the browser", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/captures",
      payload: { url: "https://example.com/" },
    });

    expect(response.statusCode).toBe(201);
    const capture = response.json();
    expect(capture).toMatchObject({
      requestedUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      outcome: "FETCHED",
      httpStatus: 200,
      title: "Example Domain",
      chromiumVersion: "153.0.8010.12",
      userAgent: identity.userAgent,
      error: null,
    });
    expect(capture.contentSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(session.close).toHaveBeenCalledOnce();
    expect(await readFile(capture.snapshotPath, "utf8")).toBe(
      "Example Domain\nThis domain is for use",
    );
    expect(JSON.stringify(capture)).not.toContain("This domain is for use");

    const listed = await app.inject({ method: "GET", url: "/api/captures" });
    expect(listed.json().captures).toEqual([capture]);
  });

  it("classifies 403 as BLOCKED and keeps the snapshot", async () => {
    session = fakeSession({ httpStatus: 403, bodyText: "Access denied" });
    const response = await app.inject({
      method: "POST",
      url: "/api/captures",
      payload: { url: "https://example.com/" },
    });
    expect(response.json()).toMatchObject({
      outcome: "BLOCKED",
      httpStatus: 403,
      error: "The site answered with HTTP 403",
    });
  });

  it("stores a navigation failure as FETCH_FAILED and still closes the browser", async () => {
    session = fakeSession({ fail: new Error("Navigation timed out") });
    const response = await app.inject({
      method: "POST",
      url: "/api/captures",
      payload: { url: "https://example.com/" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      outcome: "FETCH_FAILED",
      snapshotPath: null,
      error: "Navigation timed out",
    });
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("rejects private targets before any browser starts", async () => {
    const createSession = vi.fn();
    const response = await app.inject({
      method: "POST",
      url: "/api/captures",
      payload: { url: "https://127.0.0.1/" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("URL_REJECTED");
    expect(createSession).not.toHaveBeenCalled();
    expect(session.navigate).not.toHaveBeenCalled();
  });

  it("rejects a hostname that resolves to a private address", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/captures",
      payload: { url: "https://internal.example/offer" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "URL_REJECTED",
      message: "The hostname resolves to a private or loopback address",
    });
    expect(session.navigate).not.toHaveBeenCalled();
  });

  it("answers 503 when the browser binary is missing", async () => {
    describeBrowser = () => {
      throw new Error("The project browser binary is not installed");
    };
    const response = await app.inject({
      method: "POST",
      url: "/api/captures",
      payload: { url: "https://example.com/" },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      code: "BROWSER_UNAVAILABLE",
      message: "The project browser binary is not installed",
    });
    expect(session.navigate).not.toHaveBeenCalled();
  });
});

describe("/api/model-runs", () => {
  it("stores a measurement and lists it", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/model-runs",
      payload: {
        browserUserAgent: "Mozilla/5.0 Safari",
        modelId: "Qwen3-1.7B-q4f16_1-MLC",
        phase: "LOAD",
        cacheHit: false,
        webgpuAvailable: true,
        durationMs: 12_000,
        outputJson: null,
        error: null,
      },
    });
    expect(created.statusCode).toBe(201);
    const listed = await app.inject({ method: "GET", url: "/api/model-runs" });
    expect(listed.json().modelRuns).toEqual([created.json()]);
  });

  it("rejects an unknown model", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/model-runs",
      payload: {
        browserUserAgent: "Mozilla/5.0 Safari",
        modelId: "Qwen3-8B-q4f16_1-MLC",
        phase: "LOAD",
        cacheHit: false,
        webgpuAvailable: true,
        durationMs: 1,
        outputJson: null,
        error: null,
      },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("static PWA", () => {
  it("serves the built index and assets", async () => {
    const index = await app.inject({ method: "GET", url: "/" });
    expect(index.statusCode).toBe(200);
    expect(index.body).toContain("<title>PWA</title>");
    const asset = await app.inject({ method: "GET", url: "/app.js" });
    expect(asset.body).toBe("console.log('app')");
  });

  it("falls back to index for app routes but not for unknown API routes", async () => {
    const route = await app.inject({ method: "GET", url: "/proof/run" });
    expect(route.statusCode).toBe(200);
    expect(route.body).toContain("<title>PWA</title>");

    const asset = await app.inject({
      method: "GET",
      url: "/assets/index-old.js",
    });
    expect(asset.statusCode).toBe(404);
    const file = await app.inject({ method: "GET", url: "/missing.png" });
    expect(file.statusCode).toBe(404);

    const api = await app.inject({ method: "GET", url: "/api/nothing" });
    expect(api.statusCode).toBe(404);
    expect(api.json()).toEqual({
      code: "NOT_FOUND",
      message: "Unknown API route",
    });
  });
});
