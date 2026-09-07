import { createBrowserSession } from "./mobile-browser-session.ts";
import { runMobilePlaywrightProbe } from "./mobile-playwright-probe.ts";

const browserExecutable = process.env.MOBILE_BROWSER_EXECUTABLE_PATH;

const result = await runMobilePlaywrightProbe(() =>
  createBrowserSession(browserExecutable),
);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.outcome === "BLOCKED" || result.outcome === "FETCH_FAILED") {
  process.exitCode = 1;
}
