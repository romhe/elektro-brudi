# mobile.de self-contained headless browser capture design

## Goal

Determine whether a native, invisible macOS browser can retrieve enough rendered
mobile.de listing content to extract a purchase price and the ten Phase 0
equipment claims when Crawl4AI and generic headless Chromium are blocked.
This is a source-specific feasibility probe, not a production scraper.

## Observed baseline

- Crawl4AI alternates between an empty 138-byte shell and an HTTP 403 response.
- Containerized Playwright reached the exact reference URL with Chromium 149 but
  received the mobile.de access-denied page with HTTP 403 and no listing data.
- The official mobile.de Search API requires credentials that are unavailable.
- MotoBrudi's exact Playwright 1.57/Chromium 143 headless behavior returned HTTP
  403 twice; the same pattern on Playwright 1.63/Chromium 153 also returned 403.
- `curl_cffi` browser impersonation returned HTTP 200, but only a 2,720-byte
  Akamai JavaScript challenge shell without listing data.
- Visible Helium and directly launched headless Chrome-for-Testing with its
  visible-mode User-Agent both executed the challenge and returned the listing.

## Chosen approach

Install Playwright's pinned Chrome-for-Testing binary inside the project package,
then launch that binary directly with `--headless=new`, an ephemeral profile,
and a reserved nonzero localhost debugging port. Derive the Chromium major
version from the binary and set the User-Agent to its visible-mode value. This
removes only headless mode's `HeadlessChrome` token; Chromium supplies its native
client hints and reports `navigator.webdriver=false`. Playwright attaches over
local CDP, paces pointer and scroll input, and reads rendered `body.innerText`
plus non-secret metadata.

The real browser engine executes the site's JavaScript challenge normally. The
probe does not reimplement or skip that challenge, solve a CAPTCHA, reuse a
personal browser profile, or call undocumented APIs. It has no Docker or MCP
runtime dependency.

The rendered text remains in memory. The existing deterministic extractor
receives that text and emits the same schema-valid price and ten equipment
claims used by the Crawl4AI proof. Standard output contains only status,
timings, hashes, byte counts, bounded evidence snippets, and the extraction
envelope; it never contains the full DOM or rendered page text.

## Components and data flow

1. `pnpm install` installs the pinned browser into the project-local Playwright
   package; no system browser is required.
2. A small `mobile-playwright` command launches that browser invisibly.
3. Playwright attaches over localhost CDP and performs bounded paced navigation.
4. The probe records and verifies the browser identity before classifying the
   result as `FETCHED`, `PARTIAL`, `BLOCKED`, or
   `FETCH_FAILED` from the HTTP response and rendered page markers.
5. Only a non-blocked rendered text snapshot is passed to `extractSnapshot`.
6. A compact JSON report is written to standard output and the browser closes.

No UI, database, persistent browser profile, generic crawling, retry farm,
proxy, stealth plugin, Python runtime, Docker service, or MCP server is added.

## Error and privacy boundaries

- A consent or access-denied page is reported explicitly and never treated as
  a vehicle listing.
- CAPTCHA or manual verification remains `BLOCKED`; the probe does not attempt
  to automate it.
- Navigation timeout and browser startup failure produce `FETCH_FAILED`.
- A successful document without price or equipment evidence is `PARTIAL`.
- Full HTML, body text, cookies, browser storage, and screenshots are not saved.
- The URL is fixed so arbitrary browser navigation is outside this proof.

## Verification

- Unit tests cover access-denied classification, partial content, successful
  extraction, bounded evidence, and report privacy.
- Existing lint, typecheck, package-import, and test gates stay green.
- Run `pnpm install`, then run the invisible probe against the exact mobile.de
  reference URL. `MOBILE_BROWSER_EXECUTABLE_PATH` remains an optional diagnostic
  override, not a runtime requirement.
- The factual conclusion is based on the live HTTP status, rendered content
  size, verified identity, extracted price, and extracted equipment evidence.

## Decision rule

The approach is feasible only if the project browser repeatedly returns a real
listing and extracts at least the purchase price plus one literal equipment
claim. A 403, access-denied page, CAPTCHA, or empty application shell is a
negative result and triggers the manual-capture or dealer-source fallback.
