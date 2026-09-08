import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrowserDescription } from "@elektro-brudi/browser";
import type { BrowserSession } from "@elektro-brudi/browser";
import { RedirectBlockedError } from "@elektro-brudi/browser";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { CaptureInput } from "@elektro-brudi/storage";
import { isPrivatePeerAddress } from "./url-policy.ts";
import type { ResolvedTarget } from "./url-policy.ts";

export const CAPTURE_TIMEOUT_MS = 45_000;
/** Cross-host document redirects followed per capture, each re-validated. */
export const MAX_REDIRECT_HOPS = 3;

export interface CaptureDependencies {
  readonly createSession: (target: ResolvedTarget) => Promise<BrowserSession>;
  /** Validates and resolves a redirect location before it is followed. */
  readonly resolveTarget: (url: string) => Promise<ResolvedTarget>;
  readonly describeBrowser: () => BrowserDescription;
  readonly snapshotsDir: string;
  readonly now?: () => number;
  readonly timeoutMs?: number;
  /** Rejects a capture whose browser connected to a non-public peer. */
  readonly isPrivatePeer?: (address: string) => boolean;
}

export class BrowserUnavailableError extends Error {}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown capture failure";
}

export async function captureUrl(
  captureId: string,
  target: ResolvedTarget,
  dependencies: CaptureDependencies,
): Promise<CaptureInput> {
  const url = target.url.href;
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
    // A cross-host redirect ends the pinned session. The new host is put
    // through the same policy and pinned into a fresh browser before the
    // capture continues, so Chromium never resolves an unvalidated host.
    let current = target;
    let navigation: { readonly httpStatus: number | null } | undefined;
    for (let hop = 0; navigation === undefined; hop += 1) {
      session = await dependencies.createSession(current);
      try {
        navigation = await session.navigate(
          current.url.href,
          dependencies.timeoutMs ?? CAPTURE_TIMEOUT_MS,
        );
      } catch (error) {
        if (!(error instanceof RedirectBlockedError)) {
          throw error;
        }
        if (hop >= MAX_REDIRECT_HOPS) {
          throw new Error(
            `More than ${MAX_REDIRECT_HOPS} cross-host redirects; last location ${error.location}`,
            { cause: error },
          );
        }
        await session.close();
        session = undefined;
        current = await dependencies.resolveTarget(error.location);
      }
    }
    if (session === undefined) {
      throw new Error("The browser session ended before the page was read");
    }
    const [title, bodyText, identity, peers] = await Promise.all([
      session.title(),
      session.bodyText(),
      session.identity(),
      session.peerAddresses(),
    ]);
    // DNS is resolved again by Chromium. Verify the peers it actually
    // reached so a rebinding host cannot deliver a private page.
    const isPrivatePeer = dependencies.isPrivatePeer ?? isPrivatePeerAddress;
    const privatePeer = peers.find((address) => isPrivatePeer(address));
    if (privatePeer !== undefined) {
      throw new Error(
        `The browser connected to the non-public address ${privatePeer}; the capture was discarded`,
      );
    }
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
