# Table-First Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the winner-card-led Overview with a complete, filterable, sortable offer table and a contextual selected-offer inspector while preserving the 1440 × 1024 and 390 × 844 frame contracts.

**Architecture:** Keep the existing one-shot Figma builder and three-page file. Model representative offer records with a stable `order` decision rank, render the desktop collection as a table plus right inspector, and render the same data hierarchy as ranked cards on mobile. Bump the builder generation marker so the plugin replaces only its prior generated roots on the next run.

**Tech Stack:** JavaScript, Figma Plugin API, Node test runner, Figma Variables and Auto Layout

---

## File map

- Modify `tools/figma-elektro-brudi/code.js`: contract, offer fixtures, filter controls, sortable headers, table rows, selected-offer inspector, mobile cards, build generation.
- Modify `tools/figma-elektro-brudi/plugin.test.mjs`: static contract and structure regression tests.
- Modify `docs/superpowers/plans/2026-09-06-elektro-brudi-figma-implementation.md`: align the execution plan's Overview task with the approved table-first design.
- Modify GitHub issue #18: replace winner-card Overview language with the table-plus-inspector acceptance contract.

### Task 1: Lock the table-first Overview contract

**Files:**
- Modify: `tools/figma-elektro-brudi/plugin.test.mjs`
- Modify: `tools/figma-elektro-brudi/code.js`

- [ ] **Step 1: Write failing contract assertions**

Add a test requiring `SelectedOfferInspector`, stable offer `order` values, the exact desktop table columns, and filter labels:

```js
test('defines the table-first Overview contract', () => {
  const { contract } = require(pluginPath);
  assert.ok(contract.components.includes('SelectedOfferInspector'));
  assert.ok(!contract.components.includes('WinnerCard'));
  assert.deepEqual(contract.overviewTableColumns, [
    'Rang', 'Fahrzeug', 'Verifikation', 'Kaufpreis', 'Kilometer',
    'Effektiv/Monat', 'Golf-Differenz', 'Finanzierung', 'Ausstattung',
    'Score', 'Aktualisiert', '',
  ]);
  assert.deepEqual(contract.overviewFilters, [
    'Suche', 'Verifikation', 'Quelle', 'Finanzierung', 'Ausstattung',
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```sh
node --test --test-name-pattern="table-first Overview contract" tools/figma-elektro-brudi/plugin.test.mjs
```

Expected: FAIL because the new contract fields and component name do not exist.

- [ ] **Step 3: Update the exported contract**

Replace `WinnerCard` with `SelectedOfferInspector` and add the exact `overviewTableColumns` and `overviewFilters` arrays asserted above. Add an `overviewOffers` fixture whose records contain unique integer `order` values from 1 through 7.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command again. Expected: the focused test passes.

### Task 2: Build the desktop table and selection inspector

**Files:**
- Modify: `tools/figma-elektro-brudi/code.js`
- Test: `tools/figma-elektro-brudi/plugin.test.mjs`

- [ ] **Step 1: Write failing structural assertions**

Add source assertions requiring these semantic layer names and rejecting the obsolete desktop winner construction:

```js
test('renders a table and selected-offer inspector on desktop', () => {
  assert.match(pluginSource, /Overview filters/);
  assert.match(pluginSource, /Offer comparison table/);
  assert.match(pluginSource, /SelectedOfferInspector/);
  assert.match(pluginSource, /Sort indicator/);
  assert.doesNotMatch(pluginSource, /desktopWinner\(left/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```sh
node --test --test-name-pattern="selected-offer inspector on desktop" tools/figma-elektro-brudi/plugin.test.mjs
```

Expected: FAIL because the old winner-card layout remains.

- [ ] **Step 3: Add compact controls and summary metrics**

Create helper functions that render:

```js
overviewSummary(content, [
  ['Angebote', '7'],
  ['Verifiziert', '4'],
  ['Prüfung nötig', '2'],
  ['Aktualisiert', 'vor 2 Min.'],
]);

overviewFilters(content, [
  ['⌕', 'Fahrzeug suchen'],
  ['Verifikation', 'Alle'],
  ['Quelle', 'Alle'],
  ['Finanzierung', 'Zulässig'],
  ['Ausstattung', 'Alle'],
]);
```

Use labels in addition to symbols, 36 px desktop control height, and `Filter zurücksetzen` as a visible secondary action.

- [ ] **Step 4: Replace the desktop winner and mini-detail rail**

Render one `Offer comparison table` containing all seven fixtures. Each row includes its stable `Rang`, a selected state, a verification label, finance eligibility, equipment points, score, freshness, and an explicit detail action. Header sort indicators appear on purchase price, mileage, effective monthly cost, Golf delta, score, and freshness. The default current sort is `Rang ↑`.

Render `SelectedOfferInspector` at approximately 330 px wide. It shows the selected row's vehicle, verification state, purchase price, effective monthly cost, Golf delta, Finance `59 / 70`, Equipment `25 / 30`, three equipment facts, freshness, and `Details öffnen`. Do not render evidence excerpts, correction controls, or full finance scenarios.

- [ ] **Step 5: Run the focused test and full contract suite**

```sh
node --test --test-name-pattern="selected-offer inspector on desktop" tools/figma-elektro-brudi/plugin.test.mjs
node --test tools/figma-elektro-brudi/plugin.test.mjs
```

Expected: both commands exit 0.

### Task 3: Align mobile hierarchy and regenerate safely

**Files:**
- Modify: `tools/figma-elektro-brudi/code.js`
- Modify: `tools/figma-elektro-brudi/plugin.test.mjs`

- [ ] **Step 1: Write failing mobile and generation assertions**

```js
test('keeps rank, filters, and selection details on mobile', () => {
  assert.match(pluginSource, /Mobile search and sort/);
  assert.match(pluginSource, /Rang 1/);
  assert.match(pluginSource, /Auswahl ansehen/);
  assert.match(pluginSource, /v4-table-overview-complete/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```sh
node --test --test-name-pattern="rank, filters, and selection details on mobile" tools/figma-elektro-brudi/plugin.test.mjs
```

Expected: FAIL because the current mobile frame is winner-card-led and the generation marker is v3.

- [ ] **Step 3: Replace the mobile winner hierarchy**

Keep the mobile URL import compact, then render `Mobile search and sort`, a filter action, visible result count, and ranked OfferCards. Each card includes rank, verification, purchase price, mileage, effective monthly cost, Golf delta, equipment points, and score. The selected card includes `Auswahl ansehen`; the resulting inspector behavior is documented as a bottom sheet rather than a second page.

- [ ] **Step 4: Bump the generation marker**

Set:

```js
const BUILD_COMPLETE = 'v4-table-overview-complete';
```

The existing cleanup logic will remove only generated roots whose marker differs from v4 and rebuild all three pages.

- [ ] **Step 5: Verify JavaScript and Figma API compatibility**

Run:

```sh
node --test tools/figma-elektro-brudi/plugin.test.mjs
node --check tools/figma-elektro-brudi/code.js
```

Then type-check `code.js` against the current `@figma/plugin-typings`; expected: zero diagnostics.

### Task 4: Align issue contract and hand off visual verification

**Files:**
- Modify: `docs/superpowers/plans/2026-09-06-elektro-brudi-figma-implementation.md`
- Modify: GitHub issue #18 body

- [ ] **Step 1: Update the execution plan**

Replace Task 8 winner-card requirements with the approved table columns, filters, stable rank, selected-row behavior, and inspector boundary. Preserve the exact frame sizes and mobile no-horizontal-scroll requirement.

- [ ] **Step 2: Update GitHub issue #18**

Change the Overview acceptance language to require every offer in one sortable/filterable desktop table, stable `Rang` backed by `order`, and in-page selected-offer inspection. Remove `WinnerCard` from the minimum component list and add `SelectedOfferInspector`.

- [ ] **Step 3: Commit the implementation**

```sh
git add tools/figma-elektro-brudi/code.js \
  tools/figma-elektro-brudi/plugin.test.mjs \
  docs/superpowers/plans/2026-09-06-elektro-brudi-figma-implementation.md
git commit -m "feat: make Figma overview table-first"
```

- [ ] **Step 4: Run the plugin and visually verify**

Run `ElektroBrudi Design Builder` once in Figma Desktop. It must replace the v3 generated roots automatically and focus `Overview · Completed · Mixed verification`. Verify at 100% that all seven rows and filter controls are legible, row 1 is selected, the inspector matches that row, the table fits the desktop frame, and the mobile frame has no horizontal overflow.

- [ ] **Step 5: Keep issue #18 open until immutable evidence exists**

Export the six required PNG previews, attach them to issue #18, and close the issue only after visual verification succeeds.
