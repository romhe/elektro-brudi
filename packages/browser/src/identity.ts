// eslint-disable-next-line no-unused-vars -- Babel ESLint does not track type-only usage.
import type { BrowserIdentity } from "./types.ts";

export function isNativeBrowserIdentity(identity: BrowserIdentity): boolean {
  const brands = new Set(identity.brands);
  return (
    identity.webdriver === false &&
    !identity.userAgent.includes("HeadlessChrome") &&
    /\bChrome\/\d+/u.test(identity.userAgent) &&
    identity.platform === "MacIntel" &&
    identity.vendor === "Google Inc." &&
    identity.mobile === false &&
    identity.uaPlatform === "macOS" &&
    brands.has("Chromium")
  );
}
