# Phase 0 Runtime Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement issue #4: a double-click runtime chain of launcher, Fastify server, PWA, SQLite, bundled-Chromium capture, and WebLLM worker.

**Architecture:** See `docs/plans/2026-09-07-phase0-runtime-design.md`. Pure modules take injected dependencies so unit tests never open a real browser, socket, or model.

**Tech Stack:** Node 24.20.0 native TypeScript, pnpm 12.3.4, Fastify 5.12.3, `node:sqlite`, React 19.2.8, Vite 8.2.2, vite-plugin-pwa 1.3.0, `@mlc-ai/web-llm` 0.2.84, Playwright 1.63.0, Swift 6 AppKit, Vitest 5.

---

### Task 1: Move the browser session into `packages/browser`

- [ ] Create `packages/browser` with `package.json`, `tsconfig.json`, `src/env.ts`, `src/session.ts`, `src/identity.ts`, `src/index.ts`.
- [ ] Move `mobile-browser-session.ts` and the identity check; rename the types to `BrowserSession` and `BrowserIdentity`.
- [ ] Point `packages/feasibility` at `@elektro-brudi/browser` and keep its tests green.
- [ ] Run `pnpm lint && pnpm typecheck && pnpm test`.

### Task 2: Add `packages/storage`

- [ ] Write failing tests for open, migrate twice, insert and read records, captures, and model runs.
- [ ] Implement `database.ts` with `node:sqlite`, WAL, foreign keys, busy timeout, and `migrations/001_phase0.sql`.
- [ ] Run the storage tests.

### Task 3: Add `apps/server`

- [ ] Write failing tests: listens only on loopback, health shape without secrets, records round trip, capture with an injected fake session, URL policy rejections, SPA fallback not for `/api`.
- [ ] Implement `paths.ts`, `health.ts`, `records.ts`, `capture.ts`, `server.ts`, `index.ts`.
- [ ] Run the server tests.

### Task 4: Add `apps/web`

- [ ] Implement the PWA shell, the proof runner, the model worker, and the model client.
- [ ] Unit test the pure proof-state reducer and the JSON validation of the model output.
- [ ] Run `pnpm build` and confirm the server serves `apps/web/dist`.

### Task 5: Add the E2E proof

- [ ] Add `playwright.config.ts` and `test/e2e/phase0-runtime.spec.ts` with health, record, capture, restart persistence, WebGPU assertion, both model loads, and cache reuse.
- [ ] Run the spec headed on the target Mac.

### Task 6: Add the launcher and the bundle script

- [ ] Implement `apps/launcher` (single instance, child process, health wait, menu).
- [ ] Implement `scripts/build-phase0-app.sh` with Node download and SHA-256 verification.
- [ ] Build, open the app from Finder, verify `lsof`, quit, reopen, and confirm persistence.

### Task 7: Evidence

- [ ] Post the Chromium and Safari measurements, screenshots, and commands as an issue comment on #4.
