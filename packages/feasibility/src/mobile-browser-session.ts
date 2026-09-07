import { execFileSync, spawn } from "node:child_process";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { Browser, Page } from "playwright";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { MobileBrowserIdentity } from "./mobile-playwright-probe.ts";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { MobileBrowserSession } from "./mobile-playwright-probe.ts";

export function buildBrowserUserAgent(chromiumVersion: string): string {
  const majorVersion = /^(?<major>\d+)\./u.exec(chromiumVersion)?.groups?.major;
  if (!majorVersion) {
    throw new Error("Could not determine the Chromium major version");
  }
  return (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    `Chrome/${majorVersion}.0.0.0 Safari/537.36`
  );
}

export function buildBrowserLaunchArguments(input: {
  readonly debugPort: number;
  readonly profileDirectory: string;
  readonly userAgent: string;
}): readonly string[] {
  if (!Number.isInteger(input.debugPort) || input.debugPort <= 0) {
    throw new Error("The browser requires a nonzero CDP port");
  }
  return [
    "--headless=new",
    `--user-agent=${input.userAgent}`,
    `--remote-debugging-port=${input.debugPort}`,
    `--user-data-dir=${input.profileDirectory}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1000",
    "about:blank",
  ];
}

function readChromiumVersion(executablePath: string): string {
  const output = execFileSync(executablePath, ["--version"], {
    encoding: "utf8",
  });
  const version = /(?<version>\d+(?:\.\d+){3})/u.exec(output)?.groups?.version;
  if (!version) {
    throw new Error("Could not read the bundled Chromium version");
  }
  return version;
}

const preNavigationPoints = [
  [160, 140],
  [430, 260],
  [720, 410],
  [980, 520],
  [1180, 680],
] as const;

const postNavigationPoints = [
  [1120, 220],
  [960, 510],
  [720, 740],
  [480, 620],
  [830, 360],
] as const;

interface HumanPacingPage {
  readonly waitForTimeout: (milliseconds: number) => Promise<void>;
  readonly mouse: {
    readonly move: (
      x: number,
      y: number,
      options: { readonly steps: number },
    ) => Promise<void>;
    readonly wheel: (deltaX: number, deltaY: number) => Promise<void>;
  };
  readonly goto: (
    url: string,
    options: {
      readonly waitUntil: "domcontentloaded";
      readonly timeout: number;
    },
  ) => Promise<{ readonly status: () => number } | null>;
}

export async function performHumanPacedNavigation(
  page: HumanPacingPage,
  url: string,
  timeoutMs: number,
): Promise<{ readonly status: () => number } | null> {
  await page.waitForTimeout(1_400);
  for (const [x, y] of preNavigationPoints) {
    await page.mouse.move(x, y, { steps: 12 });
    await page.waitForTimeout(350);
  }

  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: timeoutMs,
  });

  for (const [x, y] of postNavigationPoints) {
    await page.mouse.move(x, y, { steps: 14 });
    await page.waitForTimeout(700);
  }
  await page.mouse.wheel(0, 560);
  await page.waitForTimeout(2_200);
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(2_200);

  return response;
}

async function reserveLocalPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  if (port <= 0) {
    throw new Error("Could not reserve a local CDP port");
  }
  return port;
}

async function waitForDevToolsEndpoint(
  port: number,
  process: ChildProcess,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(
        `Browser exited before CDP was ready (${process.exitCode})`,
      );
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      // The endpoint is expected to refuse connections until Chromium is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Timed out waiting for the browser CDP endpoint");
}

async function readIdentity(
  page: Page,
  browserVersion: string,
): Promise<MobileBrowserIdentity> {
  const identity = await page.evaluate(async () => {
    interface UserAgentData {
      readonly brands: readonly { readonly brand: string }[];
      readonly mobile: boolean;
      readonly platform: string;
    }
    const extendedNavigator = navigator as Navigator & {
      readonly userAgentData?: UserAgentData;
    };
    const userAgentData = extendedNavigator.userAgentData;

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      languages: [...navigator.languages],
      webdriver: navigator.webdriver,
      brands: userAgentData?.brands.map(({ brand }) => brand) ?? [],
      mobile: userAgentData?.mobile ?? null,
      uaPlatform: userAgentData?.platform ?? null,
    };
  });

  return { browserVersion, ...identity };
}

async function stopBrowser(
  browser: Browser | undefined,
  process: ChildProcess,
  profileDirectory: string,
): Promise<void> {
  await browser?.close().catch(() => undefined);
  if (process.exitCode === null) {
    process.kill("SIGTERM");
    await Promise.race([
      once(process, "exit"),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
  await rm(profileDirectory, { recursive: true, force: true });
}

export async function createBrowserSession(
  executablePath = chromium.executablePath(),
): Promise<MobileBrowserSession> {
  const chromiumVersion = readChromiumVersion(executablePath);
  const userAgent = buildBrowserUserAgent(chromiumVersion);
  const debugPort = await reserveLocalPort();
  const profileDirectory = await mkdtemp(
    join(tmpdir(), "elektro-brudi-browser-"),
  );
  const browserProcess = spawn(
    executablePath,
    buildBrowserLaunchArguments({ debugPort, profileDirectory, userAgent }),
    { stdio: "ignore" },
  );
  let browser: Browser | undefined;

  try {
    await Promise.race([
      once(browserProcess, "spawn"),
      once(browserProcess, "error").then(([error]) => Promise.reject(error)),
    ]);
    await waitForDevToolsEndpoint(debugPort, browserProcess);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error("Chromium did not expose its default browser context");
    }
    const page = context.pages()[0] ?? (await context.newPage());

    return {
      navigate: async (url, timeoutMs) => {
        const response = await performHumanPacedNavigation(
          page,
          url,
          timeoutMs,
        );
        return { httpStatus: response?.status() ?? null };
      },
      title: () => page.title(),
      bodyText: () => page.locator("body").innerText(),
      identity: () => readIdentity(page, browser!.version()),
      finalUrl: () => page.url(),
      close: () => stopBrowser(browser, browserProcess, profileDirectory),
    };
  } catch (error) {
    await stopBrowser(browser, browserProcess, profileDirectory);
    throw error;
  }
}
