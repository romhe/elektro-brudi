import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface RuntimeDirectories {
  readonly appSupportDir: string;
  readonly logDir: string;
}

export interface RunningServer {
  readonly baseUrl: string;
  readonly port: number;
  readonly process: ChildProcess;
  readonly stop: () => Promise<void>;
}

const repoRoot = resolve(import.meta.dirname, "..", "..");
export const serverEntry = join(repoRoot, "apps", "server", "src", "index.ts");
export const webDist = join(repoRoot, "apps", "web", "dist");

export async function createRuntimeDirectories(): Promise<RuntimeDirectories> {
  const root = await mkdtemp(join(tmpdir(), "elektro-brudi-e2e-"));
  return { appSupportDir: join(root, "support"), logDir: join(root, "logs") };
}

export async function startServer(
  directories: RuntimeDirectories,
  port = 0,
): Promise<RunningServer> {
  if (!existsSync(join(webDist, "index.html"))) {
    throw new Error("Run `pnpm build` first; apps/web/dist is missing");
  }
  const child = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      ELEKTROBRUDI_APP_SUPPORT_DIR: directories.appSupportDir,
      ELEKTROBRUDI_LOG_DIR: directories.logDir,
      ELEKTROBRUDI_WEB_DIST: webDist,
      ELEKTROBRUDI_PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  const listening = new Promise<string>((resolvePromise, rejectPromise) => {
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const match = /listening on (?<address>http:\/\/127\.0\.0\.1:\d+)/u.exec(
        output,
      );
      if (match?.groups?.address) {
        resolvePromise(match.groups.address);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.once("exit", (code) =>
      rejectPromise(
        new Error(
          `Server exited with code ${code} before listening:\n${output}`,
        ),
      ),
    );
  });
  const baseUrl = await listening;

  return {
    baseUrl,
    port: Number(new URL(baseUrl).port),
    process: child,
    stop: async () => {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await Promise.race([
          once(child, "exit"),
          new Promise((resolvePromise) => setTimeout(resolvePromise, 10_000)),
        ]);
        if (child.exitCode === null) {
          child.kill("SIGKILL");
          await once(child, "exit");
        }
      }
    },
  };
}
