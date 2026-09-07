import { createHash } from "node:crypto";
import { extractSnapshot, referenceSources } from "./reference-suite.ts";

export const MOBILE_REFERENCE_URL = referenceSources.find(
  ({ id }) => id === "mobile-de",
)!.url;

export type MobileProbeOutcome =
  "FETCHED" | "PARTIAL" | "BLOCKED" | "FETCH_FAILED";

interface MobileSnapshotInput {
  readonly requestedUrl: string;
  readonly finalUrl: string;
  readonly httpStatus: number | null;
  readonly title: string;
  readonly renderedText: string;
  readonly durationMs: number;
  readonly browserIdentity?: MobileBrowserIdentity;
}

export interface MobileBrowserIdentity {
  readonly browserVersion: string;
  readonly userAgent: string;
  readonly platform: string;
  readonly vendor: string;
  readonly language: string;
  readonly languages: readonly string[];
  readonly webdriver: boolean;
  readonly brands: readonly string[];
  readonly mobile: boolean | null;
  readonly uaPlatform: string | null;
}

export interface MobileBrowserSession {
  readonly navigate: (
    url: string,
    timeoutMs: number,
  ) => Promise<{ readonly httpStatus: number | null }>;
  readonly title: () => Promise<string>;
  readonly bodyText: () => Promise<string>;
  readonly identity: () => Promise<MobileBrowserIdentity>;
  readonly finalUrl: () => string;
  readonly close: () => Promise<void>;
}

export type MobileBrowserSessionFactory = () => Promise<MobileBrowserSession>;

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
  readonly browserIdentity: MobileBrowserIdentity | null;
  readonly nativeIdentityPreserved: boolean | null;
  readonly extraction: ReturnType<typeof extractSnapshot> | null;
  readonly error: string | null;
}

const blockedMarker =
  /(?:access denied|zugriff verweigert|captcha|security reasons)/iu;

export function isNativeBrowserIdentity(
  identity: MobileBrowserIdentity,
): boolean {
  const brands = new Set(identity.brands);
  return (
    identity.webdriver === false &&
    !identity.userAgent.includes("HeadlessChrome") &&
    /\bChrome\/\d+/u.test(identity.userAgent) &&
    identity.platform === "MacIntel" &&
    identity.vendor === "Google Inc." &&
    identity.mobile === false &&
    identity.uaPlatform === "macOS" &&
    brands.has("Chromium")
  );
}

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
      browserIdentity: input.browserIdentity ?? null,
      nativeIdentityPreserved: input.browserIdentity
        ? isNativeBrowserIdentity(input.browserIdentity)
        : null,
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
    browserIdentity: input.browserIdentity ?? null,
    nativeIdentityPreserved: input.browserIdentity
      ? isNativeBrowserIdentity(input.browserIdentity)
      : null,
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
    browserIdentity: null,
    nativeIdentityPreserved: null,
    extraction: null,
    error:
      input.error instanceof Error
        ? input.error.message
        : "Unknown browser failure",
  };
}

export async function runMobilePlaywrightProbe(
  createSession: MobileBrowserSessionFactory,
  now: () => number = performance.now.bind(performance),
): Promise<MobileProbeResult> {
  const startedAt = now();
  let session: MobileBrowserSession | undefined;

  try {
    session = await createSession();
    const navigation = await session.navigate(MOBILE_REFERENCE_URL, 45_000);
    const [title, renderedText, browserIdentity] = await Promise.all([
      session.title(),
      session.bodyText(),
      session.identity(),
    ]);

    return classifyMobileSnapshot({
      requestedUrl: MOBILE_REFERENCE_URL,
      finalUrl: session.finalUrl(),
      httpStatus: navigation.httpStatus,
      title,
      renderedText,
      durationMs: Math.max(0, now() - startedAt),
      browserIdentity,
    });
  } catch (error) {
    return buildMobileProbeFailure({
      requestedUrl: MOBILE_REFERENCE_URL,
      durationMs: Math.max(0, now() - startedAt),
      error,
    });
  } finally {
    await session?.close();
  }
}
