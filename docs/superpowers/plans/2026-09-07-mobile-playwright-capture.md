# mobile.de Headed Playwright Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add and run a minimal native headed Playwright probe that determines whether the fixed mobile.de listing exposes enough rendered text for price and equipment extraction.

**Architecture:** A pure module classifies a rendered browser snapshot and builds a privacy-bounded report using the existing deterministic extractor. A thin CLI owns Playwright startup, bounded navigation, in-memory text capture, JSON output, and browser shutdown; production code accepts a browser-session factory so tests never launch a browser.

**Tech Stack:** Node.js 24 native TypeScript, pnpm 12, Playwright 1.63, Vitest 5, existing `@elektro-brudi/contracts` extraction envelope.

---

### Task 1: Add the probe contract and classifier

**Files:**
- Create: `packages/feasibility/src/mobile-playwright-probe.ts`
- Create: `packages/feasibility/test/mobile-playwright-probe.test.ts`

- [ ] **Step 1: Write failing classification and privacy tests**

Create tests that import `classifyMobileSnapshot` and `buildMobileProbeReport`. Cover these exact cases:

```ts
const blocked = classifyMobileSnapshot({
  requestedUrl: MOBILE_REFERENCE_URL,
  finalUrl: MOBILE_REFERENCE_URL,
  httpStatus: 403,
  title: "Zugriff verweigert / Access denied",
  renderedText: "Access denied For security reasons",
  durationMs: 120,
});
expect(blocked.outcome).toBe("BLOCKED");
expect(blocked.extraction).toBeNull();

const fetched = classifyMobileSnapshot({
  requestedUrl: MOBILE_REFERENCE_URL,
  finalUrl: MOBILE_REFERENCE_URL,
  httpStatus: 200,
  title: "VW ID.4",
  renderedText: "Kaufpreis 29.990 EUR\nACC\nApple CarPlay",
  durationMs: 340,
});
expect(fetched.outcome).toBe("FETCHED");
expect(fetched.extraction?.fields.price?.value).toBe(29_990);
expect(fetched.extraction?.equipment.adaptive_cruise_control.state).toBe("PRESENT");
expect(JSON.stringify(fetched)).not.toContain("Kaufpreis 29.990 EUR\nACC");
```

Also verify HTTP 200 content with no price/equipment is `PARTIAL`, a thrown navigation error is represented by `buildMobileProbeFailure`, and every report omits `renderedText`, HTML, cookies, storage, and screenshots.

- [ ] **Step 2: Run the test and confirm the red state**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/mobile-playwright-probe.test.ts
```

Expected: FAIL because `mobile-playwright-probe.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure module**

Export the fixed URL, input/result types, and pure functions. The implementation must:

```ts
export const MOBILE_REFERENCE_URL = referenceSources.find(
  ({ id }) => id === "mobile-de",
)!.url;

export type MobileProbeOutcome =
  | "FETCHED"
  | "PARTIAL"
  | "BLOCKED"
  | "FETCH_FAILED";

const blockedMarker =
  /(?:access denied|zugriff verweigert|captcha|security reasons)/iu;
```

For blocked input, return no extraction. Otherwise hash the rendered text, call `extractSnapshot`, and classify as `FETCHED` only when price or a non-`UNKNOWN` equipment claim exists. Include only rendered byte count, SHA-256, bounded extraction evidence, timings, URL, title, HTTP status, outcome, and a sanitized error. Never retain the rendered text on the returned object.

- [ ] **Step 4: Run focused tests**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/mobile-playwright-probe.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit the pure probe**

```bash
git add packages/feasibility/src/mobile-playwright-probe.ts packages/feasibility/test/mobile-playwright-probe.test.ts
git commit -m "feat(feasibility): classify mobile browser captures"
```

### Task 2: Add the native headed runner and command

**Files:**
- Create: `packages/feasibility/src/mobile-playwright-cli.ts`
- Modify: `packages/feasibility/package.json`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/feasibility/test/mobile-playwright-probe.test.ts`

- [ ] **Step 1: Add a failing injected-session test**

Define a `MobileBrowserSession` interface with `navigate`, `title`, `bodyText`, `finalUrl`, and `close`. Test `runMobilePlaywrightProbe` with a fake session and assert that it:

```ts
expect(session.navigate).toHaveBeenCalledWith(MOBILE_REFERENCE_URL, 45_000);
expect(session.close).toHaveBeenCalledOnce();
expect(report.outcome).toBe("FETCHED");
expect(report.extraction?.equipment.carplay_android_auto.state).toBe("PRESENT");
```

Add a rejection test proving `close` still runs and the result is `FETCH_FAILED`.

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/mobile-playwright-probe.test.ts
```

Expected: FAIL because `runMobilePlaywrightProbe` is not implemented.

- [ ] **Step 3: Implement the injected runner**

Add `runMobilePlaywrightProbe(createSession, now)` to the pure module. Wrap the session in `try/finally`, measure duration, and return a compact failure report for startup/navigation/body-read errors. Keep Playwright types out of this module.

- [ ] **Step 4: Add pinned Playwright and scripts**

Add `playwright: "1.63.0"` to feasibility dependencies. Add:

```json
"mobile:playwright": "node src/mobile-playwright-cli.ts"
```

to the feasibility package and:

```json
"feasibility:mobile": "pnpm --filter @elektro-brudi/feasibility mobile:playwright"
```

to the root. Extend `test:package-import` to import the pure probe module, not the side-effecting CLI. Run `pnpm install` to update the lockfile.

- [ ] **Step 5: Implement the thin Playwright CLI**

Use `chromium.launch({ headless: false })`, create a fresh context with German locale, and expose it through `MobileBrowserSession`. Navigation must use `waitUntil: "domcontentloaded"` and a 45-second timeout. Wait up to 15 additional seconds for either a listing marker or denial marker, then read `document.body.innerText`. Write exactly one JSON report to stdout and set exit code 1 only for `BLOCKED` or `FETCH_FAILED`.

Do not set a custom user agent, automation-disabling flags, proxy, cookies, storage state, or profile path. Always close context and browser.

- [ ] **Step 6: Run focused and static gates**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/mobile-playwright-probe.test.ts
pnpm lint
pnpm typecheck
pnpm test
```

Expected: all commands pass.

- [ ] **Step 7: Commit the runner**

```bash
git add package.json packages/feasibility/package.json pnpm-lock.yaml packages/feasibility/src/mobile-playwright-cli.ts packages/feasibility/src/mobile-playwright-probe.ts packages/feasibility/test/mobile-playwright-probe.test.ts
git commit -m "feat(feasibility): add headed mobile Playwright probe"
```

### Task 3: Install Chromium and execute the real proof

**Files:**
- Modify only if a live-result bug requires a regression test and minimal fix.

- [ ] **Step 1: Install the pinned browser binary**

Run:

```bash
pnpm --filter @elektro-brudi/feasibility exec playwright install chromium
```

Expected: Chromium installs successfully for Playwright 1.63.0.

- [ ] **Step 2: Run the headed proof**

Run:

```bash
pnpm feasibility:mobile
```

Expected: one compact JSON object. Record HTTP status, outcome, duration, rendered byte count, SHA-256, extracted price, and all non-`UNKNOWN` equipment evidence. Confirm no full rendered text, HTML, cookies, or storage appear.

- [ ] **Step 3: Repeat once for stability**

Run the same command a second time. Compare outcome, HTTP status, price, and equipment states. Timing and hashes may differ.

- [ ] **Step 4: Fix only observed correctness defects with TDD**

If the live page is reached but a visible price or equipment claim is misclassified, first add the smallest frozen-text regression to `mobile-playwright-probe.test.ts`, confirm it fails, then make the smallest extractor change and rerun all gates. Do not add evasive browser configuration for a blocked result.

- [ ] **Step 5: Run final verification**

Run:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

Expected: every command passes, the worktree is clean after the final commit, and the factual result supports either headed-Playwright feasibility or the documented fallback.
