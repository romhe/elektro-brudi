# Headless Crawl4AI Reference Proof Design

## Goal

Prove, before building any UI or application runtime, that the existing
Crawl4AI instance can retrieve the five agreed real vehicle pages and that a
small deterministic processor can produce evidence-bearing, schema-valid data
for price and ten representative equipment attributes.

## Scope

The proof is one TypeScript command in `packages/feasibility`. It submits the
five fixed reference URLs in one Crawl4AI request, processes every returned
result independently, and writes one JSON report to standard output. It does
not persist snapshots, follow links, paginate, score offers, invoke an LLM, or
provide a UI or database.

The reference suite contains the agreed VW, Feser-Graf, Huelpert, mobile.de,
and Tesla URLs. URL fragments are retained as input metadata but are not
expected to reach the remote HTTP server.

## Data flow

1. Read the Crawl4AI API token from macOS Keychain by invoking
   `/usr/bin/security` with the fixed argument array `find-generic-password`,
   `-a`, `default`, `-s`, `de.elektrobrudi.crawl4ai`, `-w`.
2. Fetch `GET /health` to record the running Crawl4AI version.
3. Submit all five URLs to `POST /crawl` at
   `https://crawl4ai.locl.be` with Bearer authentication.
4. Normalize each response to a per-source result. A missing or failed source
   becomes an explicit failure record without discarding other sources.
5. Select `fit_markdown` when non-empty and otherwise `raw_markdown`, then
   calculate its UTF-8 byte size and SHA-256.
6. Extract the advertised price and ten equipment claims from the selected
   Markdown. Every non-null/non-`UNKNOWN` claim retains an exact substring as
   evidence.
7. Validate successful extraction envelopes with the existing
   `@elektro-brudi/contracts` schema and serialize the combined report as JSON.

## Equipment subset and semantics

The proof uses these canonical IDs from issue #32:

- `adaptive_cruise_control`
- `active_lane_centering`
- `blind_spot_lane_change_assist`
- `reversing_camera`
- `surround_view_camera`
- `matrix_pixel_led`
- `heat_pump`
- `battery_preconditioning`
- `carplay_android_auto`
- `tow_bar`

The deterministic extractor recognizes a deliberately small German/English
alias set. Explicit negative wording yields `ABSENT`; preparation/optional
wording yields `PREPARED_ONLY`; activation or subscription wording yields
`SUBSCRIPTION_REQUIRED`; an affirmative installed-equipment phrase yields
`PRESENT`; no reliable phrase yields `UNKNOWN`.

Specific terms must not be inferred from weaker ones: plain Tempomat is not
ACC, Lane Assist is not active lane centering, PDC is not a camera, LED is not
Matrix LED, Standheizung is not a heat pump, and tow-bar preparation is not an
installed tow bar. More-specific states take precedence over generic positive
matches in the same evidence line.

## Error handling and output

The CLI returns a JSON report even when one or more pages are blocked, missing,
or unprocessable. Each source records a `FETCHED`, `PARTIAL`, or `FETCH_FAILED`
outcome, final URL when supplied, HTTP status when supplied, duration, content
metrics, extraction envelope when valid, and a redacted diagnostic message.

Authentication or protocol failure affecting the whole request produces five
failure records and a non-zero process exit code. Page-level failures remain
data and do not make the report disappear. Neither the API token nor complete
HTML/Markdown is serialized.

## Verification

Unit tests exercise response normalization, failure isolation, price evidence,
all five equipment states, and the mandatory negative distinctions. The final
verification uses the pinned Node and pnpm versions, runs lint/typecheck/tests,
then executes the real five-URL suite and assesses feasibility only from its
measured JSON output.
