import { defineConfig } from "@playwright/test";

// The E2E browser is the project-local Chrome-for-Testing that pnpm install
// places next to playwright-core, the same binary the server uses for captures.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";

export default defineConfig({
  testDir: "test/e2e",
  timeout: 30 * 60 * 1000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/artifacts",
  use: {
    headless: false,
    launchOptions: { args: ["--enable-unsafe-webgpu"] },
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
