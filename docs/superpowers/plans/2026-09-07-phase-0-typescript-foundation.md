# Phase 0 TypeScript Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the smallest reproducible TypeScript workspace and strict extraction contracts needed by the Phase 0 feasibility experiments.

**Architecture:** A pnpm workspace contains one dependency-light contracts package. Zod schemas are the runtime authority and exported TypeScript types are inferred from them; Vitest and `tsc` enforce runtime and compile-time boundaries.

**Tech Stack:** Node.js 24.20.0, pnpm 12.3.4, TypeScript 7.0.2, Zod 4.5.4, Vitest 5.0.0, ESLint 10.10.0, Babel 8.0.1 TypeScript parser, Prettier 3.9.6.

---

### Task 1: Configure the minimal workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.node-version`
- Create: `tsconfig.base.json`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`

- [ ] **Step 1: Add the root manifest and exact tool versions**

```json
{
  "name": "elektro-brudi",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.3.4",
  "engines": {
    "node": "24.20.0",
    "pnpm": "12.3.4"
  },
  "scripts": {
    "lint": "eslint . && prettier --check .",
    "typecheck": "pnpm --filter @elektro-brudi/contracts typecheck",
    "test": "vitest run"
  },
  "devDependencies": {
    "@babel/core": "8.0.1",
    "@babel/eslint-parser": "8.0.1",
    "@babel/preset-typescript": "8.0.1",
    "@eslint/js": "10.0.1",
    "eslint": "10.10.0",
    "prettier": "3.9.6",
    "typescript": "7.0.2",
    "vitest": "5.0.0"
  }
}
```

- [ ] **Step 2: Add workspace and compiler configuration**

`pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
```

`.node-version`:

```text
24.20.0
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2024"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": false,
    "noEmit": true
  }
}
```

- [ ] **Step 3: Add supported lint and format configuration**

`eslint.config.js`:

```js
import babelParser from "@babel/eslint-parser";
import js from "@eslint/js";

export default [
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ["@babel/preset-typescript"] },
        sourceType: "module"
      }
    }
  }
];
```

`.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all"
}
```

- [ ] **Step 4: Add the contracts package configuration**

`packages/contracts/package.json`:

```json
{
  "name": "@elektro-brudi/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "4.5.4"
  }
}
```

`packages/contracts/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 5: Install once to generate the exact lockfile**

Run: `corepack enable && pnpm install`

Expected: pnpm 12.3.4 creates `pnpm-lock.yaml` with no unresolved peers.

- [ ] **Step 6: Commit configuration**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml .node-version tsconfig.base.json eslint.config.js .prettierrc.json packages/contracts/package.json packages/contracts/tsconfig.json
git commit -m "chore: add pinned TypeScript workspace (#25)"
```

### Task 2: Specify contract behavior with failing tests

**Files:**
- Create: `packages/contracts/test/contracts.test.ts`

- [ ] **Step 1: Write runtime and compile-time boundary tests**

Create tests which import the future schemas from `../src/index.js` and assert:

```ts
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ExtractionEnvelope } from "../src/index.js";
import {
  extractionEnvelopeSchema,
  sourceFixtureSchema,
} from "../src/index.js";

const validSource = {
  fixtureId: "dealer-detail-001",
  domain: "dealer.example",
  canonicalUrl: "https://dealer.example/cars/001",
  pageKind: "DETAIL",
  expectedFetchOutcome: "FETCHED",
  capturedAt: "2026-09-07T10:00:00.000Z",
  contentSha256: "a".repeat(64),
  split: "DEV",
} as const;

const validExtraction = {
  schemaVersion: "1.0.0",
  extractorId: "phase0-test",
  extractorVersion: "0.0.1",
  snapshotSha256: "b".repeat(64),
  fields: {
    price: {
      value: 29990,
      evidenceText: "Kaufpreis 29.990 EUR",
      sourceSection: "Fahrzeugdetails",
      confidence: 0.99,
    },
  },
  equipment: {
    heat_pump: {
      state: "PRESENT",
      evidenceText: "inklusive Waermepumpe",
      sourceSection: "Ausstattung",
      confidence: 0.98,
    },
  },
  diagnostics: [],
} as const;

describe("sourceFixtureSchema", () => {
  it("accepts a valid source fixture", () => {
    expect(sourceFixtureSchema.parse(validSource)).toEqual(validSource);
  });

  it.each(["LISTING", "UNKNOWN"])("rejects page kind %s", (pageKind) => {
    expect(() => sourceFixtureSchema.parse({ ...validSource, pageKind })).toThrow();
  });

  it("rejects an unknown fetch outcome", () => {
    expect(() =>
      sourceFixtureSchema.parse({ ...validSource, expectedFetchOutcome: "SOLD" }),
    ).toThrow();
  });

  it("rejects a non-HTTPS canonical URL", () => {
    expect(() =>
      sourceFixtureSchema.parse({ ...validSource, canonicalUrl: "http://dealer.example/001" }),
    ).toThrow();
  });
});

describe("extractionEnvelopeSchema", () => {
  it("accepts an evidence-bearing extraction", () => {
    expect(extractionEnvelopeSchema.parse(validExtraction)).toEqual(validExtraction);
  });

  it("rejects a missing schema version", () => {
    const { schemaVersion: _schemaVersion, ...withoutVersion } = validExtraction;
    expect(() => extractionEnvelopeSchema.parse(withoutVersion)).toThrow();
  });

  it("rejects an unknown equipment state", () => {
    expect(() =>
      extractionEnvelopeSchema.parse({
        ...validExtraction,
        equipment: { heat_pump: { ...validExtraction.equipment.heat_pump, state: "MAYBE" } },
      }),
    ).toThrow();
  });

  it("rejects claims without evidence", () => {
    expect(() =>
      extractionEnvelopeSchema.parse({
        ...validExtraction,
        fields: {
          price: { value: 29990, evidenceText: null, sourceSection: null, confidence: 0.99 },
        },
      }),
    ).toThrow();
  });

  it.each(["availabilityStatus", "sold", "verificationStatus", "monthlyPayment"])(
    "rejects forbidden extraction field %s",
    (fieldName) => {
      expect(() =>
        extractionEnvelopeSchema.parse({
          ...validExtraction,
          fields: { ...validExtraction.fields, [fieldName]: validExtraction.fields.price },
        }),
      ).toThrow();
    },
  );

  it("excludes forbidden top-level properties from the TypeScript type", () => {
    const envelope: ExtractionEnvelope = validExtraction;
    expectTypeOf(envelope).toMatchTypeOf<ExtractionEnvelope>();

    const withAvailability: ExtractionEnvelope = {
      ...validExtraction,
      // @ts-expect-error availability decisions are outside the LLM contract
      availabilityStatus: "AVAILABLE",
    };
    void withAvailability;
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm test`

Expected: FAIL because `packages/contracts/src/index.ts` does not exist.

- [ ] **Step 3: Commit the failing specification**

```bash
git add packages/contracts/test/contracts.test.ts
git commit -m "test: specify extraction contract boundaries (#25)"
```

### Task 3: Implement the minimal schemas

**Files:**
- Create: `packages/contracts/src/source.ts`
- Create: `packages/contracts/src/extraction.ts`
- Create: `packages/contracts/src/index.ts`

- [ ] **Step 1: Implement source fixture validation**

Define strict Zod enums and the `SourceFixture` schema in `source.ts`, including
HTTPS URL, ISO datetime, hostname, and lowercase SHA-256 checks.

- [ ] **Step 2: Implement extraction validation**

Define strict evidence, equipment, diagnostic, and envelope schemas in
`extraction.ts`. Use refinements so claims require evidence and forbidden field
keys cannot enter the envelope.

- [ ] **Step 3: Export the public contract surface**

Export schemas, inferred types, and the schema version from `index.ts`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `pnpm test packages/contracts/test/contracts.test.ts`

Expected: all contract tests pass.

- [ ] **Step 5: Run type checking**

Run: `pnpm typecheck`

Expected: exit 0, including the expected forbidden-property type error.

- [ ] **Step 6: Commit the implementation**

```bash
git add packages/contracts/src
git commit -m "feat: add strict extraction contracts (#25)"
```

### Task 4: Prove reproducibility and issue acceptance

**Files:**
- Modify only formatting changes reported by Prettier.

- [ ] **Step 1: Reinstall from the frozen lockfile under Node 24.20.0**

Run: `corepack enable && pnpm install --frozen-lockfile`

Expected: exit 0 with pnpm 12.3.4.

- [ ] **Step 2: Run all root quality gates**

Run: `pnpm lint && pnpm typecheck && pnpm test`

Expected: all commands exit 0 without warnings.

- [ ] **Step 3: Verify scope and repository state**

Run: `git status --short && git diff origin/main...HEAD --stat`

Expected: only #25 files and the two required workflow documents are present;
no `doc/`, crawler, UI, persistence, model, or finance implementation exists.

- [ ] **Step 4: Commit any formatter-only corrections**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml .node-version tsconfig.base.json eslint.config.js .prettierrc.json packages docs
git commit -m "style: format Phase 0 foundation (#25)"
```

- [ ] **Step 5: Push and create the pull request**

Push `feature/25-typescript-test-foundation`, create a PR closing #25, and
report the exact verification results and any remaining Epic #2 prerequisites.
