# Headless Crawl4AI Reference Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and execute a headless five-source Crawl4AI proof that emits evidence-bearing price and equipment results as validated JSON.

**Architecture:** A small workspace package separates deterministic Markdown extraction from the authenticated Crawl4AI transport. The CLI reads the fixed reference set, performs one request per URL for isolated timing/failures, validates successful extraction envelopes with the existing contracts package, and serializes only the compact combined report.

**Tech Stack:** Node.js 24.20.0, TypeScript 7.0.2, Zod 4.5.4 through `@elektro-brudi/contracts`, Vitest 5.0.0, native `fetch`, `crypto`, and `child_process`.

---

### Task 1: Add the feasibility workspace package

**Files:**

- Create: `packages/feasibility/package.json`
- Create: `packages/feasibility/tsconfig.json`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Define the package and root commands**

Use a private ESM package named `@elektro-brudi/feasibility`, depend on
`@elektro-brudi/contracts` through `workspace:*`, and expose these scripts:

```json
{
  "scripts": {
    "start": "node src/cli.ts",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

Add root `feasibility:run` and make root typechecking recursive:

```json
{
  "scripts": {
    "feasibility:run": "pnpm --filter @elektro-brudi/feasibility start",
    "typecheck": "pnpm -r typecheck"
  }
}
```

- [ ] **Step 2: Install from the lockfile and verify the package graph**

Run:

```bash
pnpm install
pnpm --filter @elektro-brudi/feasibility typecheck
```

Expected before source creation: typecheck fails because the package has no
included source. After Task 2 creates source, it must pass.

### Task 2: Implement evidence-bearing deterministic extraction with TDD

**Files:**

- Create: `packages/feasibility/test/reference-suite.test.ts`
- Create: `packages/feasibility/src/reference-suite.ts`

- [ ] **Step 1: Write failing extraction tests**

Tests call this public interface:

```ts
export function extractSnapshot(markdown: string): ExtractionEnvelope;
export const equipmentIds: readonly EquipmentId[];
export const referenceSources: readonly ReferenceSource[];
```

Cover price parsing, all ten equipment IDs, and table cases proving:

```ts
expect(extract("Tempomat").adaptive_cruise_control.state).toBe("UNKNOWN");
expect(extract("ACC").adaptive_cruise_control.state).toBe("PRESENT");
expect(extract("ohne ACC").adaptive_cruise_control.state).toBe("ABSENT");
expect(extract("ACC optional").adaptive_cruise_control.state).toBe(
  "PREPARED_ONLY",
);
expect(
  extract("ACC nachträglich freischaltbar").adaptive_cruise_control.state,
).toBe("SUBSCRIPTION_REQUIRED");
```

Add equivalent negative distinctions for Lane Assist, PDC, LED,
Standheizung, and tow-bar preparation. Assert that every non-`UNKNOWN` claim's
evidence is an exact substring of the input.

- [ ] **Step 2: Run the focused test and observe the missing-module failure**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/reference-suite.test.ts
```

Expected: FAIL because `../src/reference-suite.js` does not exist.

- [ ] **Step 3: Implement the minimum extractor**

Create fixed alias definitions for the approved ten IDs. Scan local Markdown
evidence windows, applying qualifier precedence
`SUBSCRIPTION_REQUIRED`, `PREPARED_ONLY`, `ABSENT`, `PRESENT`, then `UNKNOWN`.
Never use plain Tempomat, Lane Assist, PDC, LED, or Standheizung as a stronger
feature alias. Extract purchase-price candidates of at least EUR 5,000 while
rejecting lines containing monthly-rate or leasing language. Calculate the
snapshot SHA-256 and validate the returned value with
`extractionEnvelopeSchema.parse(...)`.

- [ ] **Step 4: Run the focused test until green**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/reference-suite.test.ts
```

Expected: all extractor tests pass with no warnings.

### Task 3: Implement the authenticated Crawl4AI client with TDD

**Files:**

- Create: `packages/feasibility/test/crawl4ai-client.test.ts`
- Create: `packages/feasibility/src/crawl4ai-client.ts`

- [ ] **Step 1: Write failing client tests**

Exercise injected secret and fetch functions through:

```ts
export async function readCrawl4AIToken(
  runSecurity?: SecurityRunner,
): Promise<string>;

export async function crawlReferenceSources(options: {
  sources: readonly ReferenceSource[];
  token: string;
  fetchImplementation?: typeof fetch;
  now?: () => number;
}): Promise<CrawlSuiteTransportResult>;
```

Assert fixed `/usr/bin/security` arguments, one POST per URL, Bearer headers,
duration measurement, continuation after a rejected request, response-order
preservation, and error messages that do not contain the token.

- [ ] **Step 2: Run the focused test and observe the missing-module failure**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/crawl4ai-client.test.ts
```

Expected: FAIL because `../src/crawl4ai-client.js` does not exist.

- [ ] **Step 3: Implement the minimum client**

Use `execFile` with the exact executable and arguments from the design. Fetch
`/health` once, then call `/crawl` sequentially with `{ "urls": [source.url] }`.
Normalize non-2xx responses, malformed JSON, thrown network failures, and
page-level `success: false` into redacted transport records. Retain only the
fields needed by processing; do not return request headers or credentials.

- [ ] **Step 4: Run the focused test until green**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/crawl4ai-client.test.ts
```

Expected: all client tests pass with no token in snapshots or output.

### Task 4: Compose the report CLI and verify offline behavior

**Files:**

- Create: `packages/feasibility/src/cli.ts`
- Modify: `packages/feasibility/test/reference-suite.test.ts`

- [ ] **Step 1: Add a failing suite-report test**

Provide transport results containing one successful Markdown snapshot, one
page-level failure, and one transport failure. Assert that report construction
returns all inputs in order, creates an extraction only for the successful
snapshot, and contains neither raw Markdown nor a supplied sentinel token.

- [ ] **Step 2: Run the focused test and observe the failure**

Run:

```bash
pnpm exec vitest run packages/feasibility/test/reference-suite.test.ts
```

Expected: FAIL because report construction is not implemented.

- [ ] **Step 3: Implement report construction and CLI output**

Expose:

```ts
export function buildProofReport(
  version: string | null,
  transports: readonly SourceTransportResult[],
  generatedAt?: string,
): ProofReport;
```

The CLI reads the token, invokes the client with `referenceSources`, builds the
report, writes `JSON.stringify(report, null, 2)` to stdout, and sets a non-zero
exit code only for suite-wide authentication/protocol failure. Individual
source failures remain report data.

- [ ] **Step 4: Run all offline quality gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Expected: exit 0 for all commands.

### Task 5: Execute and assess the real five-source proof

**Files:**

- No committed result file; JSON is captured outside the repository for review.

- [ ] **Step 1: Run the live suite using the pinned toolchain**

Run:

```bash
pnpm feasibility:run > /tmp/elektro-brudi-proof.json
```

Expected: valid JSON containing exactly five source results and no complete
HTML/Markdown bodies.

- [ ] **Step 2: Validate the report mechanically**

Run:

```bash
jq -e '.results | length == 5' /tmp/elektro-brudi-proof.json
jq -e '[.results[].extraction.equipment? | length] | all(. == 10)' /tmp/elektro-brudi-proof.json
```

Expected: both commands return `true` for fetched/extracted results, with
failed results explicitly classified instead of fabricated.

- [ ] **Step 3: Re-run fresh final gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
git diff --check
```

Expected: exit 0 for every command.

- [ ] **Step 4: Commit, push, open the PR, and document evidence**

Commit only the scoped source, tests, package wiring, lockfile, and plans. Push
`feature/49-headless-crawl4ai-proof`, open a PR closing #49, and add a redacted
issue comment that records the exact commit, Crawl4AI version, source outcomes,
equipment/evidence counts, and bounded GO/NO-GO assessment.
