# Phase 0 Runtime Chain Design

## Goal

Prove on the target Mac that the complete local runtime chain starts from a
Finder double-click and works end to end: `ElektroBrudi.app`, a local Fastify
process, a PWA, SQLite, a page capture through the bundled project-owned
Chromium, and WebLLM in a browser Web Worker. This is issue #4 under the
architecture decision in #51. It is a proof, not a product surface.

## Scope

The proof adds four workspace packages and one build script:

- `packages/browser` owns the browser runtime. It moves the session code from
  `packages/feasibility/src/mobile-browser-session.ts` and exposes it to the
  server and to the feasibility suite.
- `packages/storage` opens the SQLite database with `node:sqlite`, applies the
  Phase 0 migration, and exposes typed repositories for runtime records,
  captures, and model runs.
- `apps/server` is one Fastify process. It binds only to `127.0.0.1:47831`,
  serves the built PWA, and exposes `/api/health`, `/api/records`,
  `/api/captures`, and `/api/model-runs`.
- `apps/web` is a Vite React PWA. It shows health, writes a record, triggers a
  capture, loads Qwen3-1.7B and Qwen3-4B in a dedicated Web Worker, generates a
  minimal JSON object, and reports each measurement to the server.
- `apps/launcher` is a Swift menu-bar app. It enforces one instance, starts the
  bundled Node runtime with the server, waits for `/api/health`, opens the
  default browser, and offers Open, Restart, and Quit.
- `scripts/build-phase0-app.sh` builds the PWA and the launcher, downloads and
  verifies Node 24.20.0 darwin-arm64, assembles `dist/ElektroBrudi.app`, and
  signs it ad hoc.

Out of scope: product UI, scheduler, market crawler, VW pagination, LLM
extraction prompts, notarization, Intel builds.

## Fixed decisions

- Host and port are fixed to `127.0.0.1:47831`. A busy port is a clear startup
  error with exit code 2. The server never chooses another origin. Tests may
  set `ELEKTROBRUDI_PORT` to run on an ephemeral port; the host stays loopback.
- Data lives in `~/Library/Application Support/ElektroBrudi/data.sqlite` and
  `~/Library/Application Support/ElektroBrudi/snapshots/`. Logs live in
  `~/Library/Logs/ElektroBrudi/`. Tests override the roots with
  `ELEKTROBRUDI_APP_SUPPORT_DIR` and `ELEKTROBRUDI_LOG_DIR`.
- SQLite runs with `journal_mode=WAL`, `foreign_keys=ON`, and
  `busy_timeout=5000`. Migration `001_phase0.sql` runs in one transaction and is
  idempotent.
- The page capture launches the Playwright 1.63.0 Chrome-for-Testing binary
  that `pnpm install` places inside the project (`PLAYWRIGHT_BROWSERS_PATH=0`).
  `packages/browser` sets that variable before it imports Playwright, so the
  server and the app bundle do not depend on shell configuration. The browser
  runs with an ephemeral profile, `--headless=new`, a reserved loopback CDP
  port, and the User-Agent of the same binary in visible mode. It is a child of
  the server and closes after every capture. There is no token, no Keychain,
  and no external service.
- A capture accepts only public `https` URLs without user info, loopback,
  `.local`, or private or link-local IP literals. The proof target is
  `https://example.com/`.
- A capture stores the rendered body text as a file in the snapshot directory
  and stores metadata in SQLite: requested URL, final URL, HTTP status, bytes,
  SHA-256, Chromium version, duration, outcome, and a redacted error. It never
  stores cookies, profile data, screenshots, or the full DOM.
- The server runs TypeScript sources directly with Node 24 type stripping. The
  bundle contains the sources, the workspace `node_modules`, the browser
  binary, and the verified Node runtime. Nothing downloads at run time except
  the WebLLM model that the user requests in the browser.
- The model worker uses `@mlc-ai/web-llm` 0.2.84 with
  `Qwen3-1.7B-q4f16_1-MLC` and `Qwen3-4B-q4f16_1-MLC`. The UI shows download
  progress, cache hit, load error, and duration. Each load and generation posts
  a `model-run` row with browser identity, model ID, cache hit, duration, and
  the validated JSON output. The 8B model is excluded.
- The PWA does not run inference when the page is closed. A closed page stops
  the worker.
- E2E tests use `@playwright/test` 1.63.0 with a headed persistent Chromium
  context and `--enable-unsafe-webgpu`. A spec that needs WebGPU asserts
  `navigator.gpu` and fails without it. No spec skips.
- The launcher is ad-hoc signed, arm64 only. It needs the Xcode Swift toolchain
  at build time only.

## Data flow

1. The launcher starts `runtime/bin/node apps/server/src/index.ts` with the
   bundle paths as environment and waits for `GET /api/health` to answer.
2. The server opens SQLite, applies the migration, checks that the browser
   binary exists, and listens on the loopback socket.
3. The PWA reads health, posts a record, and posts a capture request.
4. The server launches the browser session, navigates with a 45 second
   timeout, reads title, body text, and identity, writes the snapshot file,
   stores the capture row, and closes the browser before it answers.
5. The PWA loads a model in the worker, generates a minimal JSON object, and
   posts the measurement. A second load reports the cache hit.
6. After quit and restart, the record, the capture row, and the model runs are
   still there.

## Error handling

- Busy port: startup error, exit code 2, no fallback port.
- Missing or broken browser binary: health reports `browser.status`
  `MISSING`; a capture request returns 503 with a redacted message; the PWA
  stays usable.
- Capture timeout or navigation failure: the capture row stores
  `FETCH_FAILED` and the reason; the browser process is closed in `finally`.
- No WebGPU or model load failure: the UI shows the error; records and
  captures still work.
- Crash: WAL mode keeps the database consistent; the next start applies the
  idempotent migration and continues.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- `pnpm exec playwright test test/e2e/phase0-runtime.spec.ts --project=chromium`.
- `scripts/build-phase0-app.sh`, `open dist/ElektroBrudi.app`,
  `lsof -nP -iTCP:47831 -sTCP:LISTEN`.
- `pgrep -f "Chrome for Testing"` has no match after a capture and after quit.
- A Safari 26 run of the same proof page with screenshots and the recorded
  model-run rows as an issue comment.
