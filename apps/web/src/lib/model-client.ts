import {
  CreateWebWorkerMLCEngine,
  hasModelInCache,
  prebuiltAppConfig,
} from "@mlc-ai/web-llm";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";
import {
  minimalExtractionSchema,
  parseModelOutput,
  proofMessages,
} from "./model-output.ts";
import type { MinimalExtraction } from "./model-output.ts";

export const modelIds = [
  "Qwen3-1.7B-q4f16_1-MLC",
  "Qwen3-4B-q4f16_1-MLC",
] as const;
export type ModelId = (typeof modelIds)[number];

export function webGpuAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    navigator.gpu !== undefined
  );
}

export async function describeWebGpu(): Promise<string> {
  if (!webGpuAvailable()) {
    throw new Error("navigator.gpu ist in diesem Browser nicht verfügbar");
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("WebGPU liefert keinen Adapter");
  }
  const info = adapter.info;
  const parts = [info.vendor, info.architecture, info.device].filter(
    (part) => part.length > 0,
  );
  const limit = adapter.limits.maxBufferSize;
  return `${parts.join(" ") || "Adapter"}; maxBufferSize ${Math.round(limit / 1024 / 1024)} MiB`;
}

export function isModelCached(modelId: ModelId): Promise<boolean> {
  return hasModelInCache(modelId, prebuiltAppConfig);
}

export interface LoadedModel {
  readonly modelId: ModelId;
  readonly engine: MLCEngineInterface;
  readonly worker: Worker;
  readonly cacheHit: boolean;
  readonly durationMs: number;
}

export async function loadModel(
  modelId: ModelId,
  onProgress: (report: InitProgressReport) => void,
): Promise<LoadedModel> {
  if (!webGpuAvailable()) {
    throw new Error("WebGPU fehlt; das Modell kann nicht geladen werden");
  }
  const cacheHit = await isModelCached(modelId);
  const worker = new Worker(
    new URL("../workers/model.worker.ts", import.meta.url),
    { type: "module" },
  );
  const startedAt = performance.now();
  try {
    const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: onProgress,
    });
    return {
      modelId,
      engine,
      worker,
      cacheHit,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    worker.terminate();
    throw error;
  }
}

export interface GenerationResult {
  readonly raw: string;
  readonly parsed: MinimalExtraction;
  readonly durationMs: number;
}

export const GENERATION_TIMEOUT_MS = 180_000;

export async function generateProofJson(
  loaded: LoadedModel,
  timeoutMs = GENERATION_TIMEOUT_MS,
): Promise<GenerationResult> {
  const startedAt = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `Generation timed out after ${Math.round(timeoutMs / 1000)} s`,
          ),
        ),
      timeoutMs,
    );
  });
  let reply;
  try {
    reply = await Promise.race([
      loaded.engine.chat.completions.create({
        messages: proofMessages,
        temperature: 0,
        max_tokens: 160,
        response_format: {
          type: "json_object",
          schema: minimalExtractionSchema,
        },
        extra_body: { enable_thinking: false },
      }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
  const raw = reply.choices[0]?.message.content ?? "";
  return {
    raw,
    parsed: parseModelOutput(raw),
    durationMs: Math.round(performance.now() - startedAt),
  };
}

export async function unloadModel(loaded: LoadedModel): Promise<void> {
  try {
    await loaded.engine.unload();
  } finally {
    loaded.worker.terminate();
  }
}
