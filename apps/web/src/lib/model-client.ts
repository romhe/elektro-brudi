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
  /** True once the worker was terminated; the engine must not be used. */
  disposed: boolean;
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
      disposed: false,
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

export interface GenerationOptions {
  readonly timeoutMs?: number;
  /** Grammar-constrained decoding via response_format. Default true. */
  readonly constrained?: boolean;
  readonly onPartial?: (partialText: string) => void;
}

export async function generateProofJson(
  loaded: LoadedModel,
  options: GenerationOptions = {},
): Promise<GenerationResult> {
  const timeoutMs = options.timeoutMs ?? GENERATION_TIMEOUT_MS;
  const constrained = options.constrained ?? true;
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

  const collect = async (): Promise<string> => {
    const stream = await loaded.engine.chat.completions.create({
      messages: proofMessages,
      temperature: 0,
      max_tokens: 160,
      stream: true,
      ...(constrained
        ? {
            response_format: {
              type: "json_object" as const,
              schema: minimalExtractionSchema,
            },
          }
        : {}),
      extra_body: { enable_thinking: false },
    });
    let text = "";
    for await (const chunk of stream) {
      text += chunk.choices[0]?.delta.content ?? "";
      options.onPartial?.(text);
    }
    return text;
  };

  if (loaded.disposed) {
    throw new Error(`${loaded.modelId} ist nicht mehr geladen`);
  }
  let raw: string;
  try {
    raw = await Promise.race([collect(), timeout]);
  } catch (error) {
    // A timeout only rejects this caller. Stop the worker so inference does
    // not continue in the background and no later unload can hang on it.
    if (!loaded.disposed) {
      try {
        void loaded.engine.interruptGenerate();
      } catch {
        // The worker may already be unresponsive; termination follows.
      }
      loaded.worker.terminate();
      loaded.disposed = true;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  return {
    raw,
    parsed: parseModelOutput(raw),
    durationMs: Math.round(performance.now() - startedAt),
  };
}

export const UNLOAD_TIMEOUT_MS = 10_000;

export async function unloadModel(loaded: LoadedModel): Promise<void> {
  if (loaded.disposed) {
    return;
  }
  loaded.disposed = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      loaded.engine.unload(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, UNLOAD_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    loaded.worker.terminate();
  }
}
