import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium, expect, test } from "@playwright/test";
import { createRuntimeDirectories, startServer } from "./server-process.ts";

function chromeProcessesFor(marker: string): string[] {
  const output = execFileSync("/bin/ps", ["-axo", "pid=,command="], {
    encoding: "utf8",
  });
  // Match only browser processes, not shells whose command line quotes
  // the marker (for example the test runner itself).
  return output
    .split("\n")
    .filter(
      (line) =>
        line.includes(marker) && line.includes("Google Chrome for Testing"),
    );
}

test.describe.configure({ mode: "serial" });

test("runtime chain: health, SQLite, bundled Chromium capture, restart persistence", async () => {
  const directories = await createRuntimeDirectories();
  const first = await startServer(directories);
  const proof: {
    recordId?: string;
    captureId?: string;
    snapshotPath?: string;
  } = {};

  try {
    const health = await (await fetch(`${first.baseUrl}/api/health`)).json();
    expect(health.status).toBe("ok");
    expect(health.listen.host).toBe("127.0.0.1");
    expect(health.database.migrations).toEqual([1]);
    expect(health.browser.status).toBe("AVAILABLE");
    test.info().annotations.push({
      type: "chromium",
      description: health.browser.chromiumVersion,
    });

    const record = await (
      await fetch(`${first.baseUrl}/api/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "e2e restart proof" }),
      })
    ).json();
    proof.recordId = record.id;
    expect(proof.recordId).toMatch(/^[0-9a-f-]{36}$/u);

    const capture = await (
      await fetch(`${first.baseUrl}/api/captures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/" }),
      })
    ).json();
    expect(capture.outcome).toBe("FETCHED");
    expect(capture.httpStatus).toBe(200);
    expect(capture.contentBytes).toBeGreaterThan(50);
    expect(capture.contentSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(capture.chromiumVersion).toBe(health.browser.chromiumVersion);
    expect(capture.userAgent).not.toContain("HeadlessChrome");
    proof.captureId = capture.id;
    proof.snapshotPath = capture.snapshotPath;
    expect(capture.snapshotPath.startsWith(directories.appSupportDir)).toBe(
      true,
    );
    expect(readFileSync(capture.snapshotPath, "utf8")).toContain(
      "Example Domain",
    );
    test.info().annotations.push({
      type: "capture",
      description: `${capture.contentBytes} bytes in ${capture.durationMs} ms`,
    });

    expect(chromeProcessesFor("elektro-brudi-browser-")).toEqual([]);

    const rejected = await fetch(`${first.baseUrl}/api/captures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://127.0.0.1/" }),
    });
    expect(rejected.status).toBe(400);

    const log = readFileSync(join(directories.logDir, "server.log"), "utf8");
    expect(log).toContain("server listening");
    expect(log).not.toContain("Example Domain");
  } finally {
    await first.stop();
  }

  expect(chromeProcessesFor("elektro-brudi-browser-")).toEqual([]);
  expect(existsSync(join(directories.appSupportDir, "data.sqlite"))).toBe(true);

  const second = await startServer(directories);
  try {
    const records = (
      await (await fetch(`${second.baseUrl}/api/records`)).json()
    ).records;
    expect(records.map((entry: { id: string }) => entry.id)).toContain(
      proof.recordId,
    );
    const captures = (
      await (await fetch(`${second.baseUrl}/api/captures`)).json()
    ).captures;
    expect(captures.map((entry: { id: string }) => entry.id)).toContain(
      proof.captureId,
    );
    expect(existsSync(proof.snapshotPath!)).toBe(true);
  } finally {
    await second.stop();
  }
});

test("a cross-host redirect is re-validated, re-pinned, and followed", async () => {
  const directories = await createRuntimeDirectories();
  const server = await startServer(directories);
  try {
    const capture = await (
      await fetch(`${server.baseUrl}/api/captures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://youtu.be/" }),
      })
    ).json();
    test.info().annotations.push({
      type: "redirect",
      description: `${capture.outcome} ${capture.httpStatus} -> ${capture.finalUrl}`,
    });
    expect(["FETCHED", "BLOCKED"]).toContain(capture.outcome);
    expect(new URL(capture.finalUrl).hostname).toBe("www.youtube.com");
    expect(chromeProcessesFor("elektro-brudi-browser-")).toEqual([]);
  } finally {
    await server.stop();
  }
});

test("SIGTERM during a capture leaves no Chromium process behind", async () => {
  const directories = await createRuntimeDirectories();
  const server = await startServer(directories);
  const capture = fetch(`${server.baseUrl}/api/captures`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/" }),
  }).catch(() => null);
  // Chromium is starting or navigating at this point.
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  expect(chromeProcessesFor("elektro-brudi-browser-").length).toBeGreaterThan(
    0,
  );

  await server.stop();
  await capture;
  await new Promise((resolve) => setTimeout(resolve, 500));
  expect(chromeProcessesFor("elektro-brudi-browser-")).toEqual([]);
});

test("busy port is a clear error, not a different origin", async () => {
  const directories = await createRuntimeDirectories();
  const holder = await startServer(directories);
  try {
    await expect(
      startServer(await createRuntimeDirectories(), holder.port),
    ).rejects.toThrow(/exited with code 2[\s\S]*already in use/u);
  } finally {
    await holder.stop();
  }
});

test("WebGPU worker loads both Qwen3 models, generates JSON, and reuses the cache after reopening", async () => {
  const directories = await createRuntimeDirectories();
  const server = await startServer(directories);
  const profileDir = resolve("test-results", "webllm-profile");
  await mkdir(profileDir, { recursive: true });
  const launch = () =>
    chromium.launchPersistentContext(profileDir, {
      headless: false,
      args: ["--enable-unsafe-webgpu"],
      viewport: { width: 1280, height: 1600 },
    });

  const waitForStep = async (
    page: import("@playwright/test").Page,
    step: string,
    timeout: number,
  ) => {
    const row = page.locator(`tr[data-step="${step}"]`);
    await expect(row).toHaveAttribute("data-status", /done|failed/u, {
      timeout,
    });
    const status = await row.getAttribute("data-status");
    const detail = await row.locator("td").nth(3).innerText();
    test.info().annotations.push({ type: step, description: detail });
    expect(status, `${step}: ${detail}`).toBe("done");
    return detail;
  };

  try {
    let context = await launch();
    let page = await context.newPage();
    await page.goto(`${server.baseUrl}/`);
    await expect(page.getByTestId("health-browser")).toContainText("AVAILABLE");

    const webgpu = await page.evaluate(() => "gpu" in navigator);
    expect(webgpu, "navigator.gpu must exist; WebGPU is required").toBe(true);

    await page.getByRole("button", { name: "WebGPU prüfen" }).click();
    await waitForStep(page, "webgpu", 60_000);

    await page.getByRole("button", { name: "Qwen3-1.7B laden" }).click();
    const firstLoad = await waitForStep(page, "load-1.7b", 20 * 60 * 1000);
    await page.getByRole("button", { name: "1.7B: JSON erzeugen" }).click();
    const smallJson = await waitForStep(page, "generate-1.7b", 5 * 60 * 1000);
    expect(smallJson).toContain('"price_eur":23880');

    await page.getByRole("button", { name: "Qwen3-4B laden" }).click();
    await waitForStep(page, "load-4b", 25 * 60 * 1000);
    await page.getByRole("button", { name: "4B: JSON erzeugen" }).click();
    const largeJson = await waitForStep(page, "generate-4b", 5 * 60 * 1000);
    expect(largeJson).toContain('"price_eur":23880');

    await context.close();

    context = await launch();
    page = await context.newPage();
    await page.goto(`${server.baseUrl}/`);
    await page.getByRole("button", { name: "Qwen3-1.7B laden" }).click();
    const secondLoad = await waitForStep(page, "load-1.7b", 10 * 60 * 1000);
    expect(secondLoad).toContain("Cache-Treffer");
    test.info().annotations.push({
      type: "reload",
      description: `first: ${firstLoad}; second: ${secondLoad}`,
    });
    await context.close();

    const runs = (
      await (await fetch(`${server.baseUrl}/api/model-runs`)).json()
    ).modelRuns as {
      modelId: string;
      phase: string;
      cacheHit: boolean | null;
      error: string | null;
      outputJson: string | null;
    }[];
    const loads = runs.filter(({ phase }) => phase === "LOAD");
    expect(loads.filter(({ error }) => error !== null)).toEqual([]);
    expect(loads.at(-1)?.cacheHit).toBe(true);
    expect(
      runs
        .filter(({ phase, error }) => phase === "GENERATE" && error === null)
        .map(({ modelId }) => modelId)
        .sort(),
    ).toEqual(["Qwen3-1.7B-q4f16_1-MLC", "Qwen3-4B-q4f16_1-MLC"]);
    expect(
      runs.every(
        ({ outputJson }) =>
          outputJson === null ||
          Object.keys(JSON.parse(outputJson)).length === 2,
      ),
    ).toBe(true);
  } finally {
    await server.stop();
  }
});
