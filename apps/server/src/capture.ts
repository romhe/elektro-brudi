import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrowserDescription } from "@elektro-brudi/browser";
import type { BrowserSession } from "@elektro-brudi/browser";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { CaptureInput } from "@elektro-brudi/storage";

export const CAPTURE_TIMEOUT_MS = 45_000;

export interface CaptureDependencies {
  readonly createSession: () => Promise<BrowserSession>;
  readonly describeBrowser: () => BrowserDescription;
  readonly snapshotsDir: string;
  readonly now?: () => number;
  readonly timeoutMs?: number;
}

export class BrowserUnavailableError extends Error {}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown capture failure";
}

export async function captureUrl(
  captureId: string,
  url: string,
  dependencies: CaptureDependencies,
): Promise<CaptureInput> {
  const now = dependencies.now ?? performance.now.bind(performance);
  const startedAt = now();
  let description: BrowserDescription;
  try {
    description = dependencies.describeBrowser();
  } catch (error) {
    throw new BrowserUnavailableError(errorMessage(error));
  }

  let session: BrowserSession | undefined;
  try {
    session = await dependencies.createSession();
    const navigation = await session.navigate(
      url,
      dependencies.timeoutMs ?? CAPTURE_TIMEOUT_MS,
    );
    const [title, bodyText, identity] = await Promise.all([
      session.title(),
      session.bodyText(),
      session.identity(),
    ]);
    const snapshotPath = join(dependencies.snapshotsDir, `${captureId}.txt`);
    await writeFile(snapshotPath, bodyText, { encoding: "utf8", mode: 0o600 });
    const blocked =
      navigation.httpStatus === 403 || navigation.httpStatus === 429;

    return {
      requestedUrl: url,
      finalUrl: session.finalUrl(),
      outcome: blocked ? "BLOCKED" : "FETCHED",
      httpStatus: navigation.httpStatus,
      title,
      contentBytes: Buffer.byteLength(bodyText, "utf8"),
      contentSha256: createHash("sha256").update(bodyText).digest("hex"),
      snapshotPath,
      chromiumVersion: description.chromiumVersion,
      userAgent: identity.userAgent,
      durationMs: Math.round(Math.max(0, now() - startedAt)),
      error: blocked
        ? `The site answered with HTTP ${navigation.httpStatus}`
        : null,
    };
  } catch (error) {
    return {
      requestedUrl: url,
      finalUrl: null,
      outcome: "FETCH_FAILED",
      httpStatus: null,
      title: null,
      contentBytes: null,
      contentSha256: null,
      snapshotPath: null,
      chromiumVersion: description.chromiumVersion,
      userAgent: null,
      durationMs: Math.round(Math.max(0, now() - startedAt)),
      error: errorMessage(error),
    };
  } finally {
    await session?.close();
  }
}
