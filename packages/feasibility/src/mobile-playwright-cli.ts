import { chromium } from "playwright";
import { runMobilePlaywrightProbe } from "./mobile-playwright-probe.ts";

const createNativeSession: Parameters<
  typeof runMobilePlaywrightProbe
>[0] = async () => {
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({ locale: "de-DE" });
    const page = await context.newPage();

    return {
      navigate: async (url, timeoutMs) => {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
        await page
          .waitForFunction(
            () => {
              const text = document.body?.innerText ?? "";
              return /(?:access denied|zugriff verweigert|captcha|€|EUR)/iu.test(
                text,
              );
            },
            undefined,
            { timeout: 15_000 },
          )
          .catch(() => undefined);
        return { httpStatus: response?.status() ?? null };
      },
      title: () => page.title(),
      bodyText: () => page.locator("body").innerText(),
      finalUrl: () => page.url(),
      close: async () => {
        await context?.close();
        await browser?.close();
      },
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
};

const result = await runMobilePlaywrightProbe(createNativeSession);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.outcome === "BLOCKED" || result.outcome === "FETCH_FAILED") {
  process.exitCode = 1;
}
