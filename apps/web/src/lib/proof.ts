export const stepIds = [
  "health",
  "record",
  "capture",
  "webgpu",
  "load-1.7b",
  "generate-1.7b",
  "load-4b",
  "generate-4b",
] as const;

export type StepId = (typeof stepIds)[number];
export type StepStatus = "pending" | "running" | "done" | "failed";

export interface StepState {
  readonly id: StepId;
  readonly label: string;
  readonly status: StepStatus;
  readonly detail: string | null;
  readonly durationMs: number | null;
}

export type ProofState = readonly StepState[];

const labels: Record<StepId, string> = {
  health: "Health-API und Datenbank",
  record: "Datensatz in SQLite schreiben",
  capture: "Seite über gebündeltes Chromium abrufen",
  webgpu: "WebGPU prüfen",
  "load-1.7b": "Qwen3-1.7B laden",
  "generate-1.7b": "Qwen3-1.7B: Minimal-JSON erzeugen",
  "load-4b": "Qwen3-4B laden",
  "generate-4b": "Qwen3-4B: Minimal-JSON erzeugen",
};

export const initialProofState: ProofState = stepIds.map((id) => ({
  id,
  label: labels[id],
  status: "pending",
  detail: null,
  durationMs: null,
}));

export type ProofAction =
  | { readonly type: "reset" }
  | { readonly type: "start"; readonly id: StepId }
  | {
      readonly type: "done";
      readonly id: StepId;
      readonly detail: string;
      readonly durationMs: number;
    }
  | { readonly type: "fail"; readonly id: StepId; readonly detail: string };

export function proofReducer(
  state: ProofState,
  action: ProofAction,
): ProofState {
  switch (action.type) {
    case "reset":
      return initialProofState;
    case "start":
      return state.map((step) =>
        step.id === action.id
          ? { ...step, status: "running", detail: null, durationMs: null }
          : step,
      );
    case "done":
      return state.map((step) =>
        step.id === action.id
          ? {
              ...step,
              status: "done",
              detail: action.detail,
              durationMs: action.durationMs,
            }
          : step,
      );
    case "fail":
      return state.map((step) =>
        step.id === action.id
          ? { ...step, status: "failed", detail: action.detail }
          : step,
      );
  }
}

export function proofSummary(state: ProofState): {
  readonly done: number;
  readonly failed: number;
  readonly pending: number;
  readonly complete: boolean;
} {
  const done = state.filter(({ status }) => status === "done").length;
  const failed = state.filter(({ status }) => status === "failed").length;
  const pending = state.length - done - failed;
  return { done, failed, pending, complete: pending === 0 };
}
