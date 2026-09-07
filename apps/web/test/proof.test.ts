import { describe, expect, it } from "vitest";
import {
  initialProofState,
  proofReducer,
  proofSummary,
  stepIds,
} from "../src/lib/proof.js";

describe("proofReducer", () => {
  it("starts with every step pending", () => {
    expect(initialProofState.map(({ id }) => id)).toEqual([...stepIds]);
    expect(proofSummary(initialProofState)).toEqual({
      done: 0,
      failed: 0,
      pending: stepIds.length,
      complete: false,
    });
  });

  it("tracks start, done, and fail transitions per step", () => {
    let state = proofReducer(initialProofState, {
      type: "start",
      id: "health",
    });
    expect(state[0]).toMatchObject({ id: "health", status: "running" });

    state = proofReducer(state, {
      type: "done",
      id: "health",
      detail: "ok",
      durationMs: 12,
    });
    expect(state[0]).toMatchObject({
      status: "done",
      detail: "ok",
      durationMs: 12,
    });

    state = proofReducer(state, {
      type: "fail",
      id: "capture",
      detail: "timeout",
    });
    expect(state.find(({ id }) => id === "capture")).toMatchObject({
      status: "failed",
      detail: "timeout",
    });
    expect(proofSummary(state)).toMatchObject({ done: 1, failed: 1 });
  });

  it("resets to the initial state", () => {
    const state = proofReducer(initialProofState, {
      type: "fail",
      id: "webgpu",
      detail: "missing",
    });
    expect(proofReducer(state, { type: "reset" })).toBe(initialProofState);
  });

  it("is complete when no step is pending", () => {
    const state = stepIds.reduce(
      (current, id) =>
        proofReducer(current, { type: "done", id, detail: "", durationMs: 1 }),
      initialProofState,
    );
    expect(proofSummary(state).complete).toBe(true);
  });
});
