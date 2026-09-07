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

export interface RuntimeRecord {
  readonly id: string;
  readonly note: string;
  readonly createdAt: string;
}

export interface Capture {
  readonly id: string;
  readonly requestedUrl: string;
  readonly finalUrl: string | null;
  readonly outcome: "FETCHED" | "BLOCKED" | "FETCH_FAILED";
  readonly httpStatus: number | null;
  readonly title: string | null;
  readonly contentBytes: number | null;
  readonly contentSha256: string | null;
  readonly snapshotPath: string | null;
  readonly chromiumVersion: string | null;
  readonly userAgent: string | null;
  readonly durationMs: number;
  readonly error: string | null;
  readonly createdAt: string;
}

export interface ModelRunInput {
  readonly browserUserAgent: string;
  readonly modelId: string;
  readonly phase: "LOAD" | "GENERATE";
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

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof body === "object" && body !== null
        ? (body as { code?: string; message?: string })
        : {};
    throw new ApiError(
      error.code ?? "HTTP_ERROR",
      error.message ?? `HTTP ${response.status}`,
      response.status,
    );
  }
  return body as T;
}

export const api = {
  health: () => request<HealthReport>("/api/health"),
  listRecords: () =>
    request<{ records: RuntimeRecord[] }>("/api/records").then(
      ({ records }) => records,
    ),
  createRecord: (note: string) =>
    request<RuntimeRecord>("/api/records", {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  listCaptures: () =>
    request<{ captures: Capture[] }>("/api/captures").then(
      ({ captures }) => captures,
    ),
  createCapture: (url: string) =>
    request<Capture>("/api/captures", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  listModelRuns: () =>
    request<{ modelRuns: ModelRun[] }>("/api/model-runs").then(
      ({ modelRuns }) => modelRuns,
    ),
  createModelRun: (run: ModelRunInput) =>
    request<ModelRun>("/api/model-runs", {
      method: "POST",
      body: JSON.stringify(run),
    }),
};
