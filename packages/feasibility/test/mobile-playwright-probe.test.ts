import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  MOBILE_REFERENCE_URL,
  buildMobileProbeFailure,
  classifyMobileSnapshot,
  runMobilePlaywrightProbe,
} from "../src/mobile-playwright-probe.js";

describe("classifyMobileSnapshot", () => {
  it("classifies the rendered mobile.de denial page as blocked", () => {
    const result = classifyMobileSnapshot({
      requestedUrl: MOBILE_REFERENCE_URL,
      finalUrl: MOBILE_REFERENCE_URL,
      httpStatus: 403,
      title: "Zugriff verweigert / Access denied",
      renderedText: "Access denied\nFor security reasons",
      durationMs: 120,
    });

    expect(result.outcome).toBe("BLOCKED");
    expect(result.extraction).toBeNull();
    expect(result.error).toBe("mobile.de returned an access-denied page");
  });

  it("extracts price and equipment without retaining the rendered text", () => {
    const renderedText = `VW ID.4 Pro Performance
Kaufpreis 29.990 EUR
Adaptive Cruise Control ACC
Apple CarPlay und Android Auto
${"additional listing copy ".repeat(30)}`;

    const result = classifyMobileSnapshot({
      requestedUrl: MOBILE_REFERENCE_URL,
      finalUrl: MOBILE_REFERENCE_URL,
      httpStatus: 200,
      title: "VW ID.4 Pro Performance",
      renderedText,
      durationMs: 340,
    });

    expect(result.outcome).toBe("FETCHED");
    expect(result.contentBytes).toBe(Buffer.byteLength(renderedText));
    expect(result.contentSha256).toBe(
      createHash("sha256").update(renderedText).digest("hex"),
    );
    expect(result.extraction?.fields.price?.value).toBe(29_990);
    expect(result.extraction?.equipment.adaptive_cruise_control?.state).toBe(
      "PRESENT",
    );
    expect(result.extraction?.equipment.carplay_android_auto?.state).toBe(
      "PRESENT",
    );
    expect(JSON.stringify(result)).not.toContain(renderedText);
    expect(result).not.toHaveProperty("renderedText");
    expect(result).not.toHaveProperty("html");
    expect(result).not.toHaveProperty("cookies");
    expect(result).not.toHaveProperty("storage");
    expect(result).not.toHaveProperty("screenshot");
  });

  it("reports a successful shell without offer evidence as partial", () => {
    const result = classifyMobileSnapshot({
      requestedUrl: MOBILE_REFERENCE_URL,
      finalUrl: MOBILE_REFERENCE_URL,
      httpStatus: 200,
      title: "mobile.de",
      renderedText: "Fahrzeuge suchen",
      durationMs: 80,
    });

    expect(result.outcome).toBe("PARTIAL");
    expect(result.extraction).not.toBeNull();
    expect(result.error).toBe(
      "Rendered page did not contain target offer evidence",
    );
  });
});

describe("buildMobileProbeFailure", () => {
  it("represents a browser failure without page content", () => {
    const result = buildMobileProbeFailure({
      requestedUrl: MOBILE_REFERENCE_URL,
      durationMs: 12,
      error: new Error("Browser did not start"),
    });

    expect(result).toMatchObject({
      outcome: "FETCH_FAILED",
      requestedUrl: MOBILE_REFERENCE_URL,
      durationMs: 12,
      contentBytes: null,
      contentSha256: null,
      extraction: null,
      error: "Browser did not start",
    });
  });
});

describe("runMobilePlaywrightProbe", () => {
  it("navigates the fixed URL and classifies the rendered result", async () => {
    const session = {
      navigate: vi.fn(async () => ({ httpStatus: 200 })),
      title: vi.fn(async () => "VW ID.4"),
      bodyText: vi.fn(async () => "Kaufpreis 29.990 EUR\nApple CarPlay"),
      finalUrl: vi.fn(() => MOBILE_REFERENCE_URL),
      close: vi.fn(async () => undefined),
    };
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(440);

    const result = await runMobilePlaywrightProbe(async () => session, now);

    expect(session.navigate).toHaveBeenCalledWith(MOBILE_REFERENCE_URL, 45_000);
    expect(session.close).toHaveBeenCalledOnce();
    expect(result.durationMs).toBe(340);
    expect(result.outcome).toBe("FETCHED");
    expect(result.extraction?.equipment.carplay_android_auto?.state).toBe(
      "PRESENT",
    );
  });

  it("closes the session after a navigation failure", async () => {
    const session = {
      navigate: vi.fn(async () => {
        throw new Error("Navigation timed out");
      }),
      title: vi.fn(async () => ""),
      bodyText: vi.fn(async () => ""),
      finalUrl: vi.fn(() => MOBILE_REFERENCE_URL),
      close: vi.fn(async () => undefined),
    };
    const now = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(60);

    const result = await runMobilePlaywrightProbe(async () => session, now);

    expect(session.close).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      outcome: "FETCH_FAILED",
      durationMs: 50,
      error: "Navigation timed out",
    });
  });
});
