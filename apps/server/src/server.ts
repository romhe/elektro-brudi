import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import fastifyStatic from "@fastify/static";
import fastify from "fastify";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { FastifyInstance } from "fastify";
import type { FastifyServerOptions } from "fastify";
import { z } from "zod";
import type { BrowserDescription } from "@elektro-brudi/browser";
import type { BrowserSession } from "@elektro-brudi/browser";
import {
  captureRepository,
  modelRunRepository,
  runtimeRecordRepository,
} from "@elektro-brudi/storage";
import type { Database } from "@elektro-brudi/storage";
import { BrowserUnavailableError, captureUrl } from "./capture.ts";
import { buildHealthReport } from "./health.ts";
import type { RuntimeConfig } from "./paths.ts";
import { assertPublicHttpsUrl } from "./url-policy.ts";

export const SERVER_VERSION = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;

export interface ServerDependencies {
  readonly config: RuntimeConfig;
  readonly database: Database;
  readonly createSession: () => Promise<BrowserSession>;
  readonly describeBrowser: () => BrowserDescription;
  readonly logger?: FastifyServerOptions["logger"];
  readonly now?: () => Date;
  readonly captureTimeoutMs?: number;
}

const recordBodySchema = z.strictObject({ note: z.string().trim().min(1) });
const captureBodySchema = z.strictObject({ url: z.string().trim().min(1) });
const modelRunBodySchema = z.strictObject({
  browserUserAgent: z.string().trim().min(1).max(512),
  modelId: z.enum(["Qwen3-1.7B-q4f16_1-MLC", "Qwen3-4B-q4f16_1-MLC"]),
  phase: z.enum(["LOAD", "GENERATE"]),
  cacheHit: z.boolean().nullable(),
  webgpuAvailable: z.boolean(),
  durationMs: z.number().int().min(0),
  outputJson: z.string().max(4_096).nullable(),
  error: z.string().max(1_024).nullable(),
});

function apiError(code: string, message: string) {
  return { code, message };
}

export function buildServer(dependencies: ServerDependencies): FastifyInstance {
  const { config, database } = dependencies;
  const now = dependencies.now ?? (() => new Date());
  const startedAt = now();
  const records = runtimeRecordRepository(database.connection);
  const captures = captureRepository(database.connection);
  const modelRuns = modelRunRepository(database.connection);
  const app = fastify({
    logger: dependencies.logger ?? false,
    bodyLimit: 16_384,
  });

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply
        .status(400)
        .send(apiError("VALIDATION_FAILED", z.prettifyError(error)));
    }
    if (error instanceof BrowserUnavailableError) {
      return reply
        .status(503)
        .send(apiError("BROWSER_UNAVAILABLE", error.message));
    }
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode >= 400
        ? error.statusCode
        : 500;
    app.log.error({ err: error }, "request failed");
    return reply
      .status(statusCode)
      .send(
        apiError(
          statusCode === 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED",
          statusCode !== 500 && error instanceof Error
            ? error.message
            : "The request failed",
        ),
      );
  });

  app.get("/api/health", () =>
    buildHealthReport({
      version: SERVER_VERSION,
      startedAt,
      now: now(),
      host: config.host,
      port: config.port,
      database,
      describeBrowser: dependencies.describeBrowser,
    }),
  );

  app.get("/api/records", () => ({ records: records.list() }));
  app.post("/api/records", async (request, reply) => {
    const body = recordBodySchema.parse(request.body);
    return reply.status(201).send(records.insert({ note: body.note }));
  });

  app.get("/api/captures", () => ({ captures: captures.list() }));
  app.post("/api/captures", async (request, reply) => {
    const body = captureBodySchema.parse(request.body);
    let url: URL;
    try {
      url = assertPublicHttpsUrl(body.url);
    } catch (error) {
      return reply
        .status(400)
        .send(
          apiError(
            "URL_REJECTED",
            error instanceof Error ? error.message : "URL rejected",
          ),
        );
    }
    const captureId = randomUUID();
    const result = await captureUrl(captureId, url.href, {
      createSession: dependencies.createSession,
      describeBrowser: dependencies.describeBrowser,
      snapshotsDir: config.paths.snapshotsDir,
      ...(dependencies.captureTimeoutMs === undefined
        ? {}
        : { timeoutMs: dependencies.captureTimeoutMs }),
    });
    const capture = captures.insert({ id: () => captureId, ...result });
    return reply.status(201).send(capture);
  });

  app.get("/api/model-runs", () => ({ modelRuns: modelRuns.list() }));
  app.post("/api/model-runs", async (request, reply) => {
    const body = modelRunBodySchema.parse(request.body);
    return reply.status(201).send(modelRuns.insert(body));
  });

  app.all("/api/*", (_request, reply) =>
    reply.status(404).send(apiError("NOT_FOUND", "Unknown API route")),
  );

  const webDistDir = config.paths.webDistDir;
  if (existsSync(webDistDir)) {
    app.register(fastifyStatic, {
      root: webDistDir,
      wildcard: false,
      index: ["index.html"],
    });
    app.setNotFoundHandler((request, reply) => {
      const path = request.url.split("?")[0] ?? "";
      const looksLikeFile =
        path.startsWith("/assets/") || /\.[a-z0-9]+$/iu.test(path);
      if (
        (request.method !== "GET" && request.method !== "HEAD") ||
        looksLikeFile
      ) {
        // A missing asset must be a 404, never the SPA shell: an outdated
        // service worker that still references old hashed files would
        // otherwise receive text/html for a module script.
        return reply.status(404).send(apiError("NOT_FOUND", "Not found"));
      }
      return reply.sendFile("index.html");
    });
  } else {
    app.setNotFoundHandler((_request, reply) =>
      reply
        .status(503)
        .send(apiError("WEB_NOT_BUILT", "The PWA has not been built yet")),
    );
  }

  return app;
}
