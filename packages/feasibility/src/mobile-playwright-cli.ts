import { createBrowserSession } from "@elektro-brudi/browser";
import { runMobilePlaywrightProbe } from "./mobile-playwright-probe.ts";

const browserExecutable = process.env.MOBILE_BROWSER_EXECUTABLE_PATH;

const result = await runMobilePlaywrightProbe(() =>
  createBrowserSession(
    browserExecutable ? { executablePath: browserExecutable } : {},
  ),
);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.outcome === "BLOCKED" || result.outcome === "FETCH_FAILED") {
  process.exitCode = 1;
}
