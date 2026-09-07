# mobile.de headed Playwright capture design

## Goal

Determine whether a native, headed macOS browser can retrieve enough rendered
mobile.de listing content to extract a purchase price and the ten Phase 0
equipment claims when Crawl4AI and Docker-hosted headless Chromium are blocked.
This is a source-specific feasibility probe, not a production scraper.

## Observed baseline

- Crawl4AI alternates between an empty 138-byte shell and an HTTP 403 response.
- Docker MCP Playwright reached the exact reference URL with Chromium 149 but
  received the mobile.de access-denied page with HTTP 403 and no listing data.
- The official mobile.de Search API requires credentials that are unavailable.

## Chosen approach

Run Playwright natively on macOS with its own ephemeral headed Chromium context.
The probe opens only the fixed mobile.de reference URL, waits a bounded amount
of time for a listing or access-denied marker, and reads rendered `body.innerText`
plus non-secret page metadata. It does not spoof browser fingerprints, solve or
bypass a CAPTCHA, reuse a personal browser profile, or call undocumented APIs.

The rendered text remains in memory. The existing deterministic extractor
receives that text and emits the same schema-valid price and ten equipment
claims used by the Crawl4AI proof. Standard output contains only status,
timings, hashes, byte counts, bounded evidence snippets, and the extraction
envelope; it never contains the full DOM or rendered page text.

## Components and data flow

1. A small `mobile-playwright` command launches native headed Chromium.
2. The browser navigates to the fixed reference URL with a hard timeout.
3. The probe classifies the result as `FETCHED`, `PARTIAL`, `BLOCKED`, or
   `FETCH_FAILED` from the HTTP response and rendered page markers.
4. Only a non-blocked rendered text snapshot is passed to `extractSnapshot`.
5. A compact JSON report is written to standard output and the browser closes.

No UI, database, persistent browser profile, generic crawling, retry farm,
proxy, stealth plugin, or anti-bot circumvention is added.

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
- Install the pinned Playwright Chromium binary and run the headed probe against
  the exact mobile.de reference URL.
- The factual conclusion is based on the live HTTP status, rendered content
  size, extracted price, and extracted equipment evidence.

## Decision rule

The approach is feasible only if the headed run repeatedly returns a real
listing and extracts at least the purchase price plus one literal equipment
claim. A 403, access-denied page, CAPTCHA, or empty application shell is a
negative result for unattended Playwright and triggers the manual-capture or
dealer-source fallback instead of more evasive automation.
