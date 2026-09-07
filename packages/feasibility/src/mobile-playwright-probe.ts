import { createHash } from "node:crypto";
import { extractSnapshot, referenceSources } from "./reference-suite.ts";

export const MOBILE_REFERENCE_URL = referenceSources.find(
  ({ id }) => id === "mobile-de",
)!.url;

export type MobileProbeOutcome =
  | "FETCHED"
  | "PARTIAL"
  | "BLOCKED"
  | "FETCH_FAILED";

interface MobileSnapshotInput {
  readonly requestedUrl: string;
  readonly finalUrl: string;
  readonly httpStatus: number | null;
  readonly title: string;
  readonly renderedText: string;
  readonly durationMs: number;
}

export interface MobileProbeResult {
  readonly reportVersion: "1.0.0";
  readonly sourceId: "mobile-de";
  readonly requestedUrl: string;
  readonly finalUrl: string | null;
  readonly outcome: MobileProbeOutcome;
  readonly httpStatus: number | null;
  readonly title: string | null;
  readonly durationMs: number;
  readonly contentBytes: number | null;
  readonly contentSha256: string | null;
  readonly extraction: ReturnType<typeof extractSnapshot> | null;
  readonly error: string | null;
}

const blockedMarker =
  /(?:access denied|zugriff verweigert|captcha|security reasons)/iu;

export function classifyMobileSnapshot(
  input: MobileSnapshotInput,
): MobileProbeResult {
  const blocked =
    input.httpStatus === 403 ||
    input.httpStatus === 429 ||
    blockedMarker.test(input.title) ||
    blockedMarker.test(input.renderedText);

  if (blocked) {
    return {
      reportVersion: "1.0.0",
      sourceId: "mobile-de",
      requestedUrl: input.requestedUrl,
      finalUrl: input.finalUrl,
      outcome: "BLOCKED",
      httpStatus: input.httpStatus,
      title: input.title,
      durationMs: input.durationMs,
      contentBytes: Buffer.byteLength(input.renderedText),
      contentSha256: createHash("sha256")
        .update(input.renderedText)
        .digest("hex"),
      extraction: null,
      error: "mobile.de returned an access-denied page",
    };
  }

  const extraction = extractSnapshot(input.renderedText);
  const hasOfferEvidence =
    extraction.fields.price?.value !== undefined ||
    Object.values(extraction.equipment).some(
      ({ state }) => state !== "UNKNOWN",
    );

  return {
    reportVersion: "1.0.0",
    sourceId: "mobile-de",
    requestedUrl: input.requestedUrl,
    finalUrl: input.finalUrl,
    outcome: hasOfferEvidence ? "FETCHED" : "PARTIAL",
    httpStatus: input.httpStatus,
    title: input.title,
    durationMs: input.durationMs,
    contentBytes: Buffer.byteLength(input.renderedText),
    contentSha256: createHash("sha256")
      .update(input.renderedText)
      .digest("hex"),
    extraction,
    error: hasOfferEvidence
      ? null
      : "Rendered page did not contain target offer evidence",
  };
}

export function buildMobileProbeFailure(input: {
  readonly requestedUrl: string;
  readonly durationMs: number;
  readonly error: unknown;
}): MobileProbeResult {
  return {
    reportVersion: "1.0.0",
    sourceId: "mobile-de",
    requestedUrl: input.requestedUrl,
    finalUrl: null,
    outcome: "FETCH_FAILED",
    httpStatus: null,
    title: null,
    durationMs: input.durationMs,
    contentBytes: null,
    contentSha256: null,
    extraction: null,
    error:
      input.error instanceof Error
        ? input.error.message
        : "Unknown browser failure",
  };
}
