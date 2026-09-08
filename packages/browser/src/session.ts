import "./env.ts";
import { execFileSync, spawn } from "node:child_process";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { Browser, Page } from "playwright";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { BrowserDescription } from "./types.ts";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { BrowserIdentity } from "./types.ts";
import type { BrowserSession } from "./types.ts";
// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { BrowserSessionOptions } from "./types.ts";
import { RedirectBlockedError } from "./types.ts";
import {
  installBrowserExitHook,
  killTrackedBrowserProcesses,
  trackBrowserProcess,
} from "./registry.ts";

const activeSessions = new Set<BrowserSession>();

/**
 * Closes every browser this process started. The server calls it on SIGTERM
 * so a capture in flight never leaves a Chromium child behind.
 */
export async function closeAllBrowserSessions(): Promise<void> {
  await Promise.all([...activeSessions].map((session) => session.close()));
  // Browsers that are still starting have no session yet.
  killTrackedBrowserProcesses("SIGTERM");
}

export function browserExecutablePath(): string {
  return chromium.executablePath();
}

export function describeBrowser(
  executablePath = browserExecutablePath(),
): BrowserDescription {
  if (!existsSync(executablePath)) {
    throw new Error("The project browser binary is not installed");
  }
  return {
    executablePath,
    chromiumVersion: readChromiumVersion(executablePath),
  };
}

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
  readonly hostResolverRules?: readonly string[];
  readonly blockLocalNetworkAccess?: boolean;
}): readonly string[] {
  if (!Number.isInteger(input.debugPort) || input.debugPort <= 0) {
    throw new Error("The browser requires a nonzero CDP port");
  }
  const rules = input.hostResolverRules ?? [];
  for (const rule of rules) {
    if (!/^MAP \S+ \S+$/u.test(rule)) {
      throw new Error(`Unsupported host resolver rule: ${rule}`);
    }
  }
  return [
    "--headless=new",
    `--user-agent=${input.userAgent}`,
    `--remote-debugging-port=${input.debugPort}`,
    `--user-data-dir=${input.profileDirectory}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,1000",
    ...(rules.length > 0 ? [`--host-resolver-rules=${rules.join(", ")}`] : []),
    ...(input.blockLocalNetworkAccess
      ? ["--enable-features=LocalNetworkAccessChecks"]
      : []),
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
): Promise<BrowserIdentity> {
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
    if (process.exitCode === null) {
      process.kill("SIGKILL");
    }
  }
  await rm(profileDirectory, { recursive: true, force: true });
}

export async function createBrowserSession(
  options: BrowserSessionOptions = {},
): Promise<BrowserSession> {
  const executablePath = options.executablePath ?? browserExecutablePath();
  const chromiumVersion = readChromiumVersion(executablePath);
  const userAgent = buildBrowserUserAgent(chromiumVersion);
  const debugPort = await reserveLocalPort();
  const profileDirectory = await mkdtemp(
    join(tmpdir(), "elektro-brudi-browser-"),
  );
  installBrowserExitHook();
  const browserProcess = spawn(
    executablePath,
    buildBrowserLaunchArguments({
      debugPort,
      profileDirectory,
      userAgent,
      ...(options.hostResolverRules
        ? { hostResolverRules: options.hostResolverRules }
        : {}),
      ...(options.blockLocalNetworkAccess
        ? { blockLocalNetworkAccess: true }
        : {}),
    }),
    { stdio: "ignore" },
  );
  const untrack = trackBrowserProcess(browserProcess);
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
    const blockedUrls: string[] = [];
    let blockedNavigation: string | undefined;
    const allowRequest = options.allowRequest;
    if (allowRequest) {
      // Raw CDP Fetch interception pauses every request Chromium issues,
      // including each redirect hop, which Playwright's page.route() does
      // not see. Service workers are bypassed so no request can skip it.
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.setBypassServiceWorker", { bypass: true });
      cdp.on("Fetch.requestPaused", (event) => {
        const { requestId, request, resourceType } = event;
        const isNavigation = resourceType === "Document";
        void Promise.resolve()
          .then(() => allowRequest(request.url, { isNavigation }))
          .catch(() => false)
          .then(async (allowed) => {
            if (allowed) {
              await cdp.send("Fetch.continueRequest", { requestId });
              return;
            }
            blockedUrls.push(request.url);
            if (isNavigation) {
              blockedNavigation ??= request.url;
            }
            await cdp.send("Fetch.failRequest", {
              requestId,
              errorReason: "BlockedByClient",
            });
          })
          .catch(() => undefined);
      });
      await cdp.send("Fetch.enable", {
        patterns: [{ urlPattern: "*", requestStage: "Request" }],
      });
    }

    const peers = new Set<string>();
    const pendingPeers: Promise<void>[] = [];
    page.on("response", (response) => {
      pendingPeers.push(
        response
          .serverAddr()
          .then((address) => {
            if (address) {
              peers.add(address.ipAddress);
            }
          })
          .catch(() => undefined),
      );
    });

    let closed = false;
    const session: BrowserSession = {
      navigate: async (url, timeoutMs) => {
        try {
          const response = await performHumanPacedNavigation(
            page,
            url,
            timeoutMs,
          );
          return { httpStatus: response?.status() ?? null };
        } catch (error) {
          if (blockedNavigation !== undefined) {
            throw new RedirectBlockedError(blockedNavigation, { cause: error });
          }
          const blocked = blockedUrls[0];
          if (blocked !== undefined) {
            throw new Error(
              `Request to ${blocked} was blocked by the URL policy`,
              { cause: error },
            );
          }
          throw error;
        }
      },
      title: () => page.title(),
      bodyText: () => page.locator("body").innerText(),
      identity: () => readIdentity(page, browser!.version()),
      finalUrl: () => page.url(),
      peerAddresses: async () => {
        await Promise.all(pendingPeers);
        return [...peers];
      },
      close: async () => {
        if (closed) {
          return;
        }
        closed = true;
        activeSessions.delete(session);
        await stopBrowser(browser, browserProcess, profileDirectory);
        untrack();
      },
    };
    activeSessions.add(session);
    return session;
  } catch (error) {
    await stopBrowser(browser, browserProcess, profileDirectory);
    untrack();
    throw error;
  }
}
