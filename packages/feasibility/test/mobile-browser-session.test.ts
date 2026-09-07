import { describe, expect, it, vi } from "vitest";
import {
  buildBrowserLaunchArguments,
  buildBrowserUserAgent,
  performHumanPacedNavigation,
} from "../src/mobile-browser-session.js";

describe("buildBrowserLaunchArguments", () => {
  it("uses a nonzero CDP port so Chromium keeps webdriver disabled", () => {
    const arguments_ = buildBrowserLaunchArguments({
      debugPort: 19_226,
      profileDirectory: "/tmp/browser-profile",
      userAgent: "Chrome/151.0.0.0",
    });

    expect(arguments_).toContain("--headless=new");
    expect(arguments_).toContain("--remote-debugging-port=19226");
    expect(arguments_).not.toContain("--remote-debugging-port=0");
    expect(arguments_).toContain("--user-agent=Chrome/151.0.0.0");
  });
});

describe("buildBrowserUserAgent", () => {
  it("uses the bundled Chromium major without a headless token", () => {
    expect(buildBrowserUserAgent("153.0.8010.12")).toBe(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/153.0.0.0 Safari/537.36",
    );
  });

  it("rejects an unrecognized Chromium version", () => {
    expect(() => buildBrowserUserAgent("not-a-version")).toThrow(
      "Could not determine the Chromium major version",
    );
  });
});

describe("performHumanPacedNavigation", () => {
  it("paces navigation with pointer movement and scrolling", async () => {
    const response = { status: () => 200 };
    const page = {
      waitForTimeout: vi.fn(async () => undefined),
      mouse: {
        move: vi.fn(async () => undefined),
        wheel: vi.fn(async () => undefined),
      },
      goto: vi.fn(async () => response),
    };

    const result = await performHumanPacedNavigation(page, MOBILE_URL, 45_000);

    expect(page.goto).toHaveBeenCalledWith(MOBILE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    expect(page.mouse.move).toHaveBeenCalledTimes(10);
    expect(page.mouse.wheel).toHaveBeenNthCalledWith(1, 0, 560);
    expect(page.mouse.wheel).toHaveBeenNthCalledWith(2, 0, 420);
    expect(page.waitForTimeout).toHaveBeenCalledWith(1_400);
    expect(page.waitForTimeout).toHaveBeenCalledWith(2_200);
    expect(result).toBe(response);
  });
});

const MOBILE_URL =
  "https://suchen.mobile.de/fahrzeuge/details.html?id=42894773078528";
