import { execFile } from "node:child_process";

export const CRAWL4AI_BASE_URL = "https://crawl4ai.locl.be";

const keychainArguments = [
  "find-generic-password",
  "-a",
  "default",
  "-s",
  "de.elektrobrudi.crawl4ai",
  "-w",
] as const;

export type SecurityRunner = (
  executable: string,
  arguments_: readonly string[],
) => Promise<string>;

export type FetchOutcome = "FETCHED" | "PARTIAL" | "FETCH_FAILED";

export interface SourceTransportResult {
  readonly sourceId: string;
  readonly requestedUrl: string;
  readonly outcome: FetchOutcome;
  readonly apiStatus: number | null;
  readonly httpStatus: number | null;
  readonly finalUrl: string | null;
  readonly durationMs: number;
  readonly markdown: string | null;
  readonly error: string | null;
}

export interface CrawlSuiteTransportResult {
  readonly version: string | null;
  readonly results: readonly SourceTransportResult[];
  readonly suiteFailure: boolean;
}

interface CrawlSource {
  readonly id: string;
  readonly url: string;
}

const defaultSecurityRunner: SecurityRunner = (executable, arguments_) =>
  new Promise((resolve, reject) => {
    execFile(
      executable,
      [...arguments_],
      { encoding: "utf8" },
      (error, stdout) => {
        if (error) {
          reject(new Error("Unable to read the Crawl4AI credential"));
          return;
        }
        resolve(stdout);
      },
    );
  });

export async function readCrawl4AIToken(
  runSecurity: SecurityRunner = defaultSecurityRunner,
): Promise<string> {
  const token = (
    await runSecurity("/usr/bin/security", keychainArguments)
  ).trim();
  if (token.length === 0) {
    throw new Error("Crawl4AI credential is missing");
  }
  return token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeError(error: unknown, token: string): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split(token).join("[REDACTED]");
}

function selectMarkdown(result: Record<string, unknown>): string | null {
  const markdown = result.markdown;
  if (typeof markdown === "string") {
    return markdown.trim().length > 0 ? markdown : null;
  }
  if (!isRecord(markdown)) {
    return null;
  }

  const fitMarkdown = readString(markdown.fit_markdown);
  if (fitMarkdown?.trim()) {
    return fitMarkdown;
  }
  const rawMarkdown = readString(markdown.raw_markdown);
  return rawMarkdown?.trim() ? rawMarkdown : null;
}

async function readVersion(
  baseUrl: string,
  token: string,
  fetchImplementation: typeof fetch,
): Promise<string | null> {
  try {
    const response = await fetchImplementation(`${baseUrl}/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return null;
    }
    const body: unknown = await response.json();
    return isRecord(body) ? readString(body.version) : null;
  } catch {
    return null;
  }
}

async function crawlSource(
  source: CrawlSource,
  baseUrl: string,
  token: string,
  fetchImplementation: typeof fetch,
  now: () => number,
): Promise<SourceTransportResult> {
  const startedAt = now();
  try {
    const response = await fetchImplementation(`${baseUrl}/crawl`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: [source.url] }),
    });
    const durationMs = Math.max(0, now() - startedAt);
    if (!response.ok) {
      return {
        sourceId: source.id,
        requestedUrl: source.url,
        outcome: "FETCH_FAILED",
        apiStatus: response.status,
        httpStatus: null,
        finalUrl: null,
        durationMs,
        markdown: null,
        error: `Crawl4AI /crawl returned HTTP ${response.status}`,
      };
    }

    const body: unknown = await response.json();
    const firstResult =
      isRecord(body) && Array.isArray(body.results) && isRecord(body.results[0])
        ? body.results[0]
        : null;
    if (!firstResult) {
      return {
        sourceId: source.id,
        requestedUrl: source.url,
        outcome: "FETCH_FAILED",
        apiStatus: response.status,
        httpStatus: null,
        finalUrl: null,
        durationMs,
        markdown: null,
        error: "Crawl4AI response did not contain a source result",
      };
    }

    const httpStatus = readNumber(firstResult.status_code);
    const finalUrl =
      readString(firstResult.redirected_url) ??
      readString(firstResult.url) ??
      source.url;
    if (firstResult.success !== true) {
      return {
        sourceId: source.id,
        requestedUrl: source.url,
        outcome: "FETCH_FAILED",
        apiStatus: response.status,
        httpStatus,
        finalUrl,
        durationMs,
        markdown: null,
        error: sanitizeError(
          readString(firstResult.error_message) ?? "Crawl4AI page crawl failed",
          token,
        ),
      };
    }

    const markdown = selectMarkdown(firstResult);
    return {
      sourceId: source.id,
      requestedUrl: source.url,
      outcome: markdown ? "FETCHED" : "PARTIAL",
      apiStatus: response.status,
      httpStatus,
      finalUrl,
      durationMs,
      markdown,
      error: markdown ? null : "Crawl succeeded without usable Markdown",
    };
  } catch (error) {
    return {
      sourceId: source.id,
      requestedUrl: source.url,
      outcome: "FETCH_FAILED",
      apiStatus: null,
      httpStatus: null,
      finalUrl: null,
      durationMs: Math.max(0, now() - startedAt),
      markdown: null,
      error: sanitizeError(error, token),
    };
  }
}

export async function crawlReferenceSources(options: {
  readonly sources: readonly CrawlSource[];
  readonly token: string;
  readonly baseUrl?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly now?: () => number;
}): Promise<CrawlSuiteTransportResult> {
  const baseUrl = (options.baseUrl ?? CRAWL4AI_BASE_URL).replace(/\/$/u, "");
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const now = options.now ?? performance.now.bind(performance);
  const version = await readVersion(
    baseUrl,
    options.token,
    fetchImplementation,
  );
  const results: SourceTransportResult[] = [];

  for (const source of options.sources) {
    results.push(
      await crawlSource(
        source,
        baseUrl,
        options.token,
        fetchImplementation,
        now,
      ),
    );
  }

  const suiteFailure =
    results.length > 0 &&
    results.every(
      ({ apiStatus }) =>
        apiStatus === 401 || apiStatus === 403 || apiStatus === null,
    );

  return { version, results, suiteFailure };
}
