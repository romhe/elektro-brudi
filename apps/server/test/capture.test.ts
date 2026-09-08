import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RedirectBlockedError } from "@elektro-brudi/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureUrl } from "../src/capture.js";

const identity = {
  browserVersion: "153.0.8010.12",
  userAgent: "Mozilla/5.0 Chrome/153.0.0.0",
  platform: "MacIntel",
  vendor: "Google Inc.",
  language: "de-DE",
  languages: ["de-DE"],
  webdriver: false,
  brands: ["Chromium"],
  mobile: false,
  uaPlatform: "macOS",
} as const;

function session(behaviour: {
  readonly redirectTo?: string;
  readonly finalUrl: string;
}) {
  return {
    navigate: vi.fn(async () => {
      if (behaviour.redirectTo) {
        throw new RedirectBlockedError(behaviour.redirectTo);
      }
      return { httpStatus: 200 };
    }),
    title: vi.fn(async () => "Landing"),
    bodyText: vi.fn(async () => "Landing page text"),
    identity: vi.fn(async () => identity),
    peerAddresses: vi.fn(async () => ["93.184.216.34"]),
    finalUrl: vi.fn(() => behaviour.finalUrl),
    close: vi.fn(async () => undefined),
  };
}

const target = (href: string) => ({
  url: new URL(href),
  addresses: ["93.184.216.34"],
});

let snapshotsDir: string;
beforeEach(async () => {
  snapshotsDir = await mkdtemp(join(tmpdir(), "elektro-brudi-capture-"));
});
afterEach(async () => {
  await rm(snapshotsDir, { recursive: true, force: true });
});

describe("captureUrl redirects", () => {
  it("re-validates and re-pins a cross-host redirect before following it", async () => {
    const first = session({
      redirectTo: "https://landing.example/offer",
      finalUrl: "https://start.example/",
    });
    const second = session({ finalUrl: "https://landing.example/offer" });
    const createSession = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const resolveTarget = vi.fn(async (url: string) => target(url));

    const result = await captureUrl("cap-1", target("https://start.example/"), {
      createSession,
      resolveTarget,
      describeBrowser: () => ({
        executablePath: "/x",
        chromiumVersion: "153.0.8010.12",
      }),
      snapshotsDir,
    });

    expect(resolveTarget).toHaveBeenCalledWith("https://landing.example/offer");
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(createSession.mock.calls[1]?.[0].url.hostname).toBe(
      "landing.example",
    );
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      requestedUrl: "https://start.example/",
      finalUrl: "https://landing.example/offer",
      outcome: "FETCHED",
    });
  });

  it("fails the capture when the redirect location violates the policy", async () => {
    const first = session({
      redirectTo: "https://internal.example/",
      finalUrl: "https://start.example/",
    });
    const result = await captureUrl("cap-2", target("https://start.example/"), {
      createSession: vi.fn().mockResolvedValue(first),
      resolveTarget: vi.fn(async () => {
        throw new Error(
          "The hostname resolves to a private or loopback address",
        );
      }),
      describeBrowser: () => ({
        executablePath: "/x",
        chromiumVersion: "153.0.8010.12",
      }),
      snapshotsDir,
    });
    expect(result).toMatchObject({
      outcome: "FETCH_FAILED",
      snapshotPath: null,
      error: "The hostname resolves to a private or loopback address",
    });
    expect(first.close).toHaveBeenCalledOnce();
  });

  it("stops after the maximum number of cross-host hops", async () => {
    const looping = () =>
      session({ redirectTo: "https://next.example/", finalUrl: "x" });
    const createSession = vi.fn(async () => looping());
    const result = await captureUrl("cap-3", target("https://start.example/"), {
      createSession,
      resolveTarget: vi.fn(async (url: string) => target(url)),
      describeBrowser: () => ({
        executablePath: "/x",
        chromiumVersion: "153.0.8010.12",
      }),
      snapshotsDir,
    });
    expect(result.outcome).toBe("FETCH_FAILED");
    expect(result.error).toContain("More than 3 cross-host redirects");
    expect(createSession).toHaveBeenCalledTimes(4);
  });
});
