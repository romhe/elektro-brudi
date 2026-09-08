import { describe, expect, it, vi } from "vitest";
import {
  killTrackedBrowserProcesses,
  trackBrowserProcess,
  trackedBrowserProcesses,
} from "../src/registry.js";

function fakeProcess(exitCode: number | null) {
  return { pid: 4242, exitCode, kill: vi.fn(() => true) };
}

describe("browser process registry", () => {
  it("kills every live tracked process and forgets it", () => {
    const live = fakeProcess(null);
    const exited = fakeProcess(0);
    const untrack = trackBrowserProcess(live);
    trackBrowserProcess(exited);

    expect(trackedBrowserProcesses()).toHaveLength(2);
    expect(killTrackedBrowserProcesses()).toBe(1);
    expect(live.kill).toHaveBeenCalledWith("SIGKILL");
    expect(exited.kill).not.toHaveBeenCalled();
    expect(trackedBrowserProcesses()).toEqual([]);
    untrack();
  });

  it("stops tracking a process that closed normally", () => {
    const live = fakeProcess(null);
    const untrack = trackBrowserProcess(live);
    untrack();
    expect(killTrackedBrowserProcesses()).toBe(0);
    expect(live.kill).not.toHaveBeenCalled();
  });
});
