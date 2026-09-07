# Phase 0 TypeScript Foundation Design

## Purpose

Issue #25 establishes only the executable TypeScript boundary needed by the
Phase 0 feasibility work. It does not implement crawling, persistence, a user
interface, model execution, ranking, or finance logic.

## Workspace

The repository is a pnpm workspace with one package,
`@elektro-brudi/contracts`. Root scripts provide the required `lint`,
`typecheck`, and `test` entry points. Node.js, pnpm, TypeScript, Zod, Vitest,
ESLint, and Prettier are pinned exactly, and the pnpm lockfile is committed.

TypeScript 7.0.2 is newer than the supported range of TypeScript-ESLint at the
time of implementation. ESLint therefore uses the Babel 8 TypeScript parser
for syntax-aware linting, while TypeScript itself remains the authority for
type checking. This keeps every installed combination supported without
downgrading the version fixed by the issue.

## Contracts

`SourceFixture` records fixture identity, source domain, HTTPS canonical URL,
page kind, expected fetch outcome, capture time, content hash, and DEV/TEST
split. Hashes are lowercase SHA-256 strings and timestamps are ISO datetimes
with an offset.

`ExtractionEnvelope` is versioned and contains extractor identity, snapshot
hash, evidence-bearing vehicle fields, evidence-bearing equipment states, and
diagnostics. Field and equipment keys remain generic strings so issue #32 can
introduce the canonical taxonomy without changing the envelope shape.

The extraction schema is strict. Non-null field values and non-UNKNOWN
equipment states require quoted evidence and a source section. Finance,
leasing, availability, sold, and verification keys are rejected both at the
envelope boundary and inside the field map. The LLM boundary performs no
financial or availability decisions.

## Verification

Vitest exercises valid parsing and rejection of missing versions, unknown enum
values, invalid hashes, non-HTTPS URLs, evidence-free claims, and forbidden
properties. Compile-time assertions ensure forbidden top-level properties are
not part of `ExtractionEnvelope`.

The final proof uses the issue's exact commands under the downloaded and
checksum-verified Node.js 24.20.0 arm64 runtime:

1. `corepack enable`
2. `pnpm install --frozen-lockfile`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test`
