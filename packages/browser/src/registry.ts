export interface TrackedProcess {
  readonly pid?: number | undefined;
  readonly exitCode: number | null;
  readonly kill: (signal?: NodeJS.Signals | number) => boolean;
}

const tracked = new Set<TrackedProcess>();

/**
 * Every spawned browser is tracked from the moment of spawn, before CDP is
 * connected, so a shutdown during startup still reaches it.
 */
export function trackBrowserProcess(process: TrackedProcess): () => void {
  tracked.add(process);
  return () => tracked.delete(process);
}

export function trackedBrowserProcesses(): readonly TrackedProcess[] {
  return [...tracked];
}

/** Synchronous last resort for process exit hooks. */
export function killTrackedBrowserProcesses(
  signal: NodeJS.Signals = "SIGKILL",
): number {
  let killed = 0;
  for (const process of tracked) {
    if (process.exitCode === null) {
      try {
        process.kill(signal);
        killed += 1;
      } catch {
        // The process may have exited between the check and the signal.
      }
    }
    tracked.delete(process);
  }
  return killed;
}

let exitHookInstalled = false;
export function installBrowserExitHook(): void {
  if (exitHookInstalled) {
    return;
  }
  exitHookInstalled = true;
  process.on("exit", () => {
    killTrackedBrowserProcesses();
  });
}
