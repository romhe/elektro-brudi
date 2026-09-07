# Answer-First Offer Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only the desktop and mobile Offer Detail references with an answer-first layout that combines a prominent listing image and original-offer link with the recommendation, monthly installment, complete Golf comparison, and selected-credit terms without changing the user's adapted Overview.

**Architecture:** Extend the existing no-network Figma development plugin with an explicit Offer Detail fixture, reusable financial-detail layout helpers, and a targeted two-frame updater. The updater builds and validates both replacement frames before swapping them into the completed Key Screens root; it never rebuilds or removes the root, Overview, import states, or Settings.

**Tech Stack:** Figma Plugin API JavaScript, Node.js built-in test runner, static contract tests, Figma Desktop visual verification.

---

## File Map

- Create `tools/figma-elektro-brudi/assets/ioniq5-reference.png`: clearly disclosed reference-only vehicle image used to assess the Figma media treatment.
- Modify `tools/figma-elektro-brudi/code.js`: define the reference fixture, compose both answer-first layouts, embed the reference image, and add the targeted safe updater.
- Modify `tools/figma-elektro-brudi/plugin.test.mjs`: lock the required content hierarchy and prove that the update path cannot rebuild the Overview.
- Modify `tools/figma-elektro-brudi/README.md`: explain targeted rerun behavior and visual verification.
- Reference `docs/plans/2026-09-07-answer-first-offer-detail-design.md`: approved design contract; do not change during implementation unless the user changes the design.

### Task 1: Lock the Detail Content and Preservation Contract

**Files:**
- Modify: `tools/figma-elektro-brudi/plugin.test.mjs`
- Test: `tools/figma-elektro-brudi/plugin.test.mjs`

- [ ] **Step 1: Add failing content-hierarchy tests**

Append these tests:

```js
test('makes the selected financing scenario understandable at a glance', () => {
  const detailFunction = pluginSource.slice(
    pluginSource.indexOf('function buildOfferDetailReference('),
    pluginSource.indexOf('\nfunction buildSettingsReference('),
  );
  for (const label of [
    'Quelle: mobile.de',
    'Originalangebot öffnen ↗',
    '1 von 12',
    'Warum dieses Angebot gut passt',
    'Deine Zahlungen',
    'Monatsrate',
    'Heute',
    'Am Ende',
    'Vergleich mit deinem Golf',
    'Ausgewählte Finanzierung',
    'Effektiver Jahreszins',
    'Gesamtkosten des Kredits',
    'Gesamtbetrag inkl. Anzahlung',
    'Warum 84 von 100 Punkten?',
  ]) {
    assert.ok(detailFunction.includes(label), `missing detail copy: ${label}`);
  }
  assert.doesNotMatch(detailFunction, /FINANCE_ELIGIBLE/);
});

test('distinguishes installment from effective monthly cost', () => {
  assert.match(pluginSource, /499 € Monatsrate/);
  assert.match(pluginSource, /1\.033 € \/ Monat/);
  assert.match(pluginSource, /1\.104 € \/ Monat/);
  assert.match(pluginSource, /71 € \/ Monat günstiger/);
  assert.match(pluginSource, /Anzahlung, Raten, Schlussrate, Gebühren, laufende Kosten und Restwert/);
});

test('uses a prominent disclosed listing-media pattern', () => {
  assert.match(pluginSource, /Listing image/);
  assert.match(pluginSource, /Kein Fahrzeugbild verfügbar/);
  assert.match(pluginSource, /Beispielfoto/);
  assert.match(pluginSource, /Originalangebot öffnen ↗/);
  assert.match(pluginSource, /sourceDomain: 'mobile\.de'/);
  assert.match(pluginSource, /sourceUrl/);
});

test('shows the selected credit as aligned start, monthly, end, and total groups', () => {
  for (const group of ['Start', 'Monatlich', 'Am Ende', 'Gesamt']) {
    assert.ok(pluginSource.includes(`Finance group · ${group}`));
  }
  assert.match(pluginSource, /Beispieldaten: Zins, Schlussrate und Gesamtkosten/);
  assert.match(pluginSource, /Hyundai Finance/);
  assert.match(pluginSource, /Ballonfinanzierung/);
});
```

- [ ] **Step 2: Add a failing Overview-preservation test**

Append:

```js
test('updates only the two exact Offer Detail frames', () => {
  assert.match(pluginSource, /function updateOfferDetailReferences\(/);
  assert.match(pluginSource, /contract\.referenceSections\[0\]/);
  assert.match(pluginSource, /contract\.referenceSections\[1\]/);
  assert.match(pluginSource, /Offer detail · updating · Desktop/);
  assert.match(pluginSource, /Offer detail · updating · Mobile/);
  assert.doesNotMatch(pluginSource, /existingScreens\.remove\(/);
  assert.doesNotMatch(pluginSource, /protectedOverview\.remove\(/);
  assert.match(pluginSource, /Overview changed during Offer Detail update/);
});
```

- [ ] **Step 3: Run the tests and verify the new tests fail**

Run:

```bash
node --test tools/figma-elektro-brudi/plugin.test.mjs
```

Expected: the existing 13 tests pass and the new tests fail because the answer-first labels and targeted updater do not exist yet.

- [ ] **Step 4: Commit the red contract tests**

```bash
git add tools/figma-elektro-brudi/plugin.test.mjs
git commit -m "test: lock answer-first offer detail contract"
```

### Task 2: Add a Disclosed Reference Image Asset

**Files:**
- Create: `tools/figma-elektro-brudi/assets/ioniq5-reference.png`
- Modify: `tools/figma-elektro-brudi/code.js`
- Test: `tools/figma-elektro-brudi/plugin.test.mjs`

- [ ] **Step 1: Generate the reference-only vehicle image**

Use the `imagegen` skill to create a 16:10, neutral daylight photograph-style image of a generic white electric crossover from a front three-quarter angle on an uncluttered dealership forecourt. Do not reproduce mobile.de branding, a real registration plate, a visible logo, or a specific copyrighted listing photograph. Save the resulting PNG at `tools/figma-elektro-brudi/assets/ioniq5-reference.png`.

- [ ] **Step 2: Add the media fixture and encode the image for the no-network plugin**

Add this minimal fixture plus an `IMAGE_BYTES_BASE64` constant containing the generated PNG bytes, then create the Figma image with:

```js
const OFFER_DETAIL = Object.freeze({
  vehicle: 'Hyundai IONIQ 5 · Techniq',
  sourceDomain: 'mobile.de',
  sourceUrl: 'offer.sourceUrl',
  imageAlt: 'Hyundai IONIQ 5 Techniq, Außenansicht vorne links',
});

function base64Bytes(value) {
  const binary = figma.base64Decode(value);
  return new Uint8Array(binary);
}

function listingImage(parent, width, height) {
  const media = frame(parent, 'Listing image', { width, height, fill: C.subtle, radius: 12, clipsContent: true });
  try {
    const image = figma.createImage(base64Bytes(IMAGE_BYTES_BASE64));
    media.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  } catch (error) {
    text(media, 'Kein Fahrzeugbild verfügbar', { size: 13, weight: 600, color: C.secondary });
  }
  const count = auto(media, 'Gallery position', 'HORIZONTAL', { x: 12, y: 12, fill: C.surface, radius: 12, paddingLeft: 9, paddingRight: 9, height: 24, counterAlign: 'CENTER' });
  text(count, '1 von 12', { size: 10, weight: 600 });
  const disclosure = auto(media, 'Image disclosure', 'HORIZONTAL', { x: 12, y: height - 36, fill: C.surface, radius: 10, paddingLeft: 8, paddingRight: 8, height: 24, counterAlign: 'CENTER' });
  text(disclosure, 'Beispielfoto', { size: 10, weight: 600, color: C.secondary });
  media.setPluginData('alt-text', OFFER_DETAIL.imageAlt);
  return media;
}
```

If absolute-positioned overlays conflict with auto layout, wrap the image fill and overlay labels in a non-auto-layout frame; do not remove the disclosure.

- [ ] **Step 3: Add the source row**

Place this directly below the image:

```js
function listingSource(parent, width) {
  const row = auto(parent, 'Listing source', 'HORIZONTAL', { width, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  text(row, `Quelle: ${OFFER_DETAIL.sourceDomain}`, { size: 11, color: C.secondary });
  const action = button(row, 'Originalangebot öffnen ↗', { kind: 'secondary', height: 40 });
  action.setPluginData('external-url-binding', OFFER_DETAIL.sourceUrl);
  return row;
}
```

- [ ] **Step 4: Run the media contract tests**

```bash
node --check tools/figma-elektro-brudi/code.js
node --test tools/figma-elektro-brudi/plugin.test.mjs
```

Expected: syntax check exits 0; the media test passes while the answer-first layout and targeted-updater tests remain red.

- [ ] **Step 5: Commit the media pattern**

```bash
git add tools/figma-elektro-brudi/assets/ioniq5-reference.png tools/figma-elektro-brudi/code.js tools/figma-elektro-brudi/plugin.test.mjs
git commit -m "feat: add offer detail listing media"
```

### Task 3: Build the Answer-First Desktop and Mobile References

**Files:**
- Modify: `tools/figma-elektro-brudi/code.js`
- Test: `tools/figma-elektro-brudi/plugin.test.mjs`

- [ ] **Step 1: Replace the minimal media fixture with the internally consistent display fixture**

Place this after `contract`:

```js
const OFFER_DETAIL = Object.freeze({
  vehicle: 'Hyundai IONIQ 5 · Techniq',
  rank: 'Rang 1',
  score: '84 / 100',
  price: '36.490 €',
  mileage: '22.900 km',
  registration: 'EZ 04/2023',
  source: 'Autohaus Nord · vor 2 Min. aktualisiert',
  sourceDomain: 'mobile.de',
  sourceUrl: 'offer.sourceUrl',
  imageAlt: 'Hyundai IONIQ 5 Techniq, Außenansicht vorne links',
  reasons: [
    '71 € / Monat günstiger im vollständigen Golf-Vergleich',
    '499 € Monatsrate liegt 51 € unter deinem Ratenbudget',
    'Wärmepumpe und Matrix-LED sind verifiziert',
  ],
  payment: { now: '10.000 €', monthly: '499 €', end: '8.249 €', term: '48 Monate' },
  comparison: { offer: '1.033 € / Monat', golf: '1.104 € / Monat', delta: '71 € / Monat günstiger', term: '3.408 € Vorteil in 48 Monaten' },
  finance: {
    start: [['Anbieter', 'Hyundai Finance'], ['Finanzierungsart', 'Ballonfinanzierung'], ['Kaufpreis', '36.490 €'], ['Anzahlung', '10.000 €'], ['Nettodarlehen', '26.490 €']],
    monthly: [['Monatsrate', '499 €'], ['Laufzeit', '48 Monate'], ['Sollzins', '6,31 % p. a.'], ['Effektiver Jahreszins', '6,49 % p. a.']],
    end: [['Schlussrate', '8.249 €'], ['Fällig am', '30.04.2028']],
    total: [['Gebühren', '0 €'], ['Gesamtkosten des Kredits', '5.711 €'], ['Gesamte Kreditrückzahlung', '32.201 €'], ['Gesamtbetrag inkl. Anzahlung', '42.201 €']],
  },
});
```

The Golf totals are representative UI fixture values. Keep the visible `Beispieldaten` disclosure described below so the reference cannot be mistaken for imported truth.

- [ ] **Step 2: Add reusable aligned financial helpers**

Add these functions immediately before `buildOfferDetailReference`:

```js
function detailReason(parent, copy, width) {
  const row = auto(parent, `Reason · ${copy}`, 'HORIZONTAL', { width, gap: 9, counterAlign: 'MIN' });
  iconBox(row, '✓', { box: 22, fill: C.successBg, color: C.success, radius: 11, size: 11 });
  text(row, copy, { size: 12, weight: 600, width: width - 31, lineHeight: 17 });
  return row;
}

function paymentMilestone(parent, label, value, detail, width, emphasized = false) {
  const node = auto(parent, `Payment · ${label}`, 'VERTICAL', {
    width, fill: emphasized ? C.infoBg : C.subtle, radius: 10, padding: 12, gap: 3,
  });
  text(node, label, { size: 11, weight: 600, color: C.secondary });
  text(node, value, { size: emphasized ? 25 : 18, weight: 700, color: emphasized ? C.accent : C.text });
  text(node, detail, { size: 10, color: C.secondary, width: width - 24, lineHeight: 14 });
  return node;
}

function financeValueRow(parent, label, value, width) {
  const row = auto(parent, `Finance value · ${label}`, 'HORIZONTAL', {
    width, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER', paddingTop: 3, paddingBottom: 3,
  });
  text(row, label, { size: 11, color: C.secondary, width: Math.floor(width * 0.56) });
  text(row, value, { size: 12, weight: 600, width: Math.floor(width * 0.4), align: 'RIGHT' });
  return row;
}

function financeGroup(parent, title, rows, width) {
  const group = auto(parent, `Finance group · ${title}`, 'VERTICAL', { width, gap: 5 });
  text(group, title, { size: 12, weight: 700, color: C.text });
  divider(group, width);
  rows.forEach(([label, value]) => financeValueRow(group, label, value, width));
  return group;
}
```

- [ ] **Step 3: Replace the desktop composition**

Rewrite `buildOfferDetailReference` so the desktop branch creates a 40/60 hero: `listingImage` plus `listingSource` on the left, and the following identity/decision/payment content on the right:

```js
const identity = auto(content, 'Offer identity', 'VERTICAL', { width: contentWidth, gap: 6 });
const status = auto(identity, 'Offer status', 'HORIZONTAL', { width: contentWidth, gap: 7, counterAlign: 'CENTER' });
badge(status, 'Verifiziert verfügbar', 'success');
badge(status, OFFER_DETAIL.rank, 'neutral');
badge(status, OFFER_DETAIL.score, 'success');
text(identity, OFFER_DETAIL.vehicle, { size: 28, weight: 700 });
text(identity, `${OFFER_DETAIL.price} · ${OFFER_DETAIL.mileage} · ${OFFER_DETAIL.registration} · ${OFFER_DETAIL.source}`, { size: 11, color: C.secondary, width: contentWidth });

const summary = auto(content, 'Immediate decision summary', 'HORIZONTAL', { width: contentWidth, gap: 14, counterAlign: 'MIN' });
const why = card(summary, 'Warum dieses Angebot gut passt', { width: 456, padding: 16, gap: 9, shadow: true });
text(why, 'Warum dieses Angebot gut passt', { size: 18, weight: 700 });
text(why, 'Gute Wahl für dein Budget und deine Anforderungen.', { size: 12, color: C.secondary, width: 424 });
OFFER_DETAIL.reasons.forEach((reason) => detailReason(why, reason, 424));

const payments = card(summary, 'Deine Zahlungen', { width: 342, padding: 16, gap: 9 });
text(payments, 'Deine Zahlungen', { size: 18, weight: 700 });
paymentMilestone(payments, 'Monatlich', OFFER_DETAIL.payment.monthly, `Monatsrate · ${OFFER_DETAIL.payment.term}`, 310, true);
const ends = auto(payments, 'Payment endpoints', 'HORIZONTAL', { width: 310, gap: 8 });
paymentMilestone(ends, 'Heute', OFFER_DETAIL.payment.now, 'Anzahlung', 151);
paymentMilestone(ends, 'Am Ende', OFFER_DETAIL.payment.end, 'Schlussrate', 151);
text(payments, 'Die Monatsrate allein ist nicht der vollständige Preis.', { size: 10, color: C.secondary, width: 310 });
```

Then add a `Vergleich mit deinem Golf` card with three aligned columns for `Dieses Angebot`, `Dein Golf`, and `Dein Vorteil`; include `1.033 € / Monat`, `1.104 € / Monat`, `71 € / Monat günstiger`, `3.408 € Vorteil in 48 Monaten`, and the sentence `Enthält Anzahlung, Raten, Schlussrate, Gebühren, laufende Kosten und Restwert.`

Add `Ausgewählte Finanzierung` as a full-width card. Its header contains `Zulässig` and `Finanzierung ändern`. Under it, render four columns with `financeGroup` and the fixture's `start`, `monthly`, `end`, and `total` arrays. End the card with the warning-colored disclosure `Beispieldaten: Zins, Schlussrate und Gesamtkosten`.

Finally render `Warum 84 von 100 Punkten?` with structured Finance and Equipment explanations, followed by grouped `Bestätigt` and `Noch prüfen` equipment/evidence rows. Attach `Bestätigen` and `Als unbekannt` only to the `Anhängerkupplung` row.

- [ ] **Step 4: Implement the mobile reading order**

Use the same fixture and helpers, but set the frame height to `1500` and stack content in this exact order:

```js
['Offer identity', 'Listing image', 'Listing source',
 'Warum dieses Angebot gut passt', 'Deine Zahlungen',
 'Vergleich mit deinem Golf', 'Ausgewählte Finanzierung',
 'Alternative Finanzierungen', 'Warum 84 von 100 Punkten?',
 'Ausstattung & Belege']
```

Render all four finance groups vertically at 318 px content width. Do not hide them in an accordion. Keep every action at least 44 px high.

- [ ] **Step 5: Run syntax and contract tests**

```bash
node --check tools/figma-elektro-brudi/code.js
node --test tools/figma-elektro-brudi/plugin.test.mjs
```

Expected: syntax check exits 0; all tests except the targeted-updater test pass.

- [ ] **Step 6: Commit the new compositions**

```bash
git add tools/figma-elektro-brudi/code.js tools/figma-elektro-brudi/plugin.test.mjs
git commit -m "feat: redesign offer detail around user decisions"
```

### Task 4: Add the Safe Targeted Figma Update Path

**Files:**
- Modify: `tools/figma-elektro-brudi/code.js`
- Test: `tools/figma-elektro-brudi/plugin.test.mjs`

- [ ] **Step 1: Add detail update versioning**

Add beside the existing build constants:

```js
const DETAIL_BUILD_STATUS_KEY = 'elektro-brudi-offer-detail-status';
const DETAIL_BUILD_COMPLETE = 'v1-answer-first-credit-detail';
```

- [ ] **Step 2: Implement a two-frame build-before-swap transaction**

Add before `build()`:

```js
function exactDescendant(root, name) {
  return root.findOne((node) => node.name === name);
}

function overviewIdentity(root) {
  return contract.overviewFrames.map(({ name }) => {
    const node = exactDescendant(root, name);
    if (!node) throw new Error(`Protected Overview not found: ${name}`);
    return `${node.id}:${node.name}:${node.x}:${node.y}:${node.width}:${node.height}`;
  }).join('|');
}

function assertReadableDetail(frameNode, requiredCopy) {
  const copy = frameNode.findAllWithCriteria({ types: ['TEXT'] }).map((node) => node.characters);
  requiredCopy.forEach((label) => {
    if (!copy.some((value) => value.includes(label))) throw new Error(`Offer Detail validation failed: ${label}`);
  });
}

function updateOfferDetailReferences(root) {
  const protectedOverview = overviewIdentity(root);
  const desktopName = contract.referenceSections[0];
  const mobileName = contract.referenceSections[1];
  const oldDesktop = exactDescendant(root, desktopName);
  const oldMobile = exactDescendant(root, mobileName);
  if (!oldDesktop || !oldMobile) throw new Error('Both existing Offer Detail frames are required for a safe update.');

  const created = [];
  try {
    const desktop = buildOfferDetailReference(root, 'Offer detail · updating · Desktop', oldDesktop.x, oldDesktop.y, false);
    const mobile = buildOfferDetailReference(root, 'Offer detail · updating · Mobile', oldMobile.x, oldMobile.y, true);
    created.push(desktop, mobile);
    assertReadableDetail(desktop, ['Warum dieses Angebot gut passt', '499 €', 'Effektiver Jahreszins']);
    assertReadableDetail(mobile, ['Warum dieses Angebot gut passt', '499 €', 'Effektiver Jahreszins']);
    if (overviewIdentity(root) !== protectedOverview) throw new Error('Overview changed during Offer Detail update.');
    oldDesktop.remove();
    oldMobile.remove();
    desktop.name = desktopName;
    mobile.name = mobileName;
    root.setPluginData(DETAIL_BUILD_STATUS_KEY, DETAIL_BUILD_COMPLETE);
    return { desktop, mobile };
  } catch (error) {
    created.forEach((node) => {
      if (!node.removed) node.remove();
    });
    throw error;
  }
}
```

- [ ] **Step 3: Route completed files through only the targeted updater**

Replace the existing `if (completeRoots.length)` branch inside `build()` with:

```js
if (completeRoots.length) {
  await figma.setCurrentPageAsync(pages[2]);
  const existingScreens = completeRoots.find((node) => node.name === GENERATED_ROOTS[2]);
  if (!existingScreens) throw new Error('Completed Key Screens root was not found.');
  await loadContext();
  const existingDetail = exactDescendant(existingScreens, contract.referenceSections[0]);
  if (existingScreens.getPluginData(DETAIL_BUILD_STATUS_KEY) === DETAIL_BUILD_COMPLETE && existingDetail) {
    figma.currentPage.selection = [existingDetail];
    figma.viewport.scrollAndZoomIntoView([existingDetail]);
    figma.closePlugin('Answer-first Offer Detail already present.');
    return;
  }
  const { desktop } = updateOfferDetailReferences(existingScreens);
  figma.currentPage.selection = [desktop];
  figma.viewport.scrollAndZoomIntoView([desktop]);
  figma.notify('Offer Detail updated. Übersicht preserved.', { timeout: 5000 });
  figma.closePlugin('Offer Detail updated successfully.');
  return;
}
```

Do not call `buildKeyScreens`, `prepareGeneratedTargets` removal logic, or any Overview builder from this branch.

- [ ] **Step 4: Run the full tests**

```bash
node --check tools/figma-elektro-brudi/code.js
node --test tools/figma-elektro-brudi/plugin.test.mjs
```

Expected: syntax check exits 0 and all tests pass.

- [ ] **Step 5: Commit the safe update path**

```bash
git add tools/figma-elektro-brudi/code.js tools/figma-elektro-brudi/plugin.test.mjs
git commit -m "fix: update only Figma offer detail frames"
```

### Task 5: Document and Verify the Figma Result

**Files:**
- Modify: `tools/figma-elektro-brudi/README.md`
- Verify: Figma file `ZsgHumU2OEGQrJgT5ebiJQ`

- [ ] **Step 1: Document targeted rerun behavior**

Replace the README's blanket rerun statement with:

```markdown
When a completed ElektroBrudi root exists, the plugin updates only
`Offer detail · Pattern · Desktop` and `Offer detail · Pattern · Mobile`.
It validates both replacements before swapping them in and never rebuilds the
Key Screens root, Overview, import flow, or Settings. Later reruns focus the
completed desktop Offer Detail without overwriting manual edits.
```

- [ ] **Step 2: Run repository verification**

```bash
node --check tools/figma-elektro-brudi/code.js
node --test tools/figma-elektro-brudi/plugin.test.mjs
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit the documentation**

```bash
git add tools/figma-elektro-brudi/README.md
git commit -m "docs: explain targeted offer detail update"
```

- [ ] **Step 4: Load the new reference in Figma Desktop**

Run **Plugins → Development → ElektroBrudi Design Builder** once in the existing Figma file. Expected toast: `Offer Detail updated. Übersicht preserved.` The desktop Offer Detail is selected and fitted automatically.

- [ ] **Step 5: Verify desktop and mobile visually**

For each exact frame name, select it and press **Shift+2**:

- `Offer detail · Pattern · Desktop`
- `Offer detail · Pattern · Mobile`

Confirm that the vehicle image is prominent and correctly cropped, `Beispielfoto` is visible, the source domain and `Originalangebot öffnen ↗` appear beside it, all text is visible, no row is clipped, credit values align, `499 €` is labeled as the monthly installment, one-time payments are adjacent, and `71 € / Monat günstiger` is presented as the complete effective comparison. Confirm the rendered font is SF Pro Text/Display or the established Inter fallback; a blank or zero-width text node fails verification.

- [ ] **Step 6: Prove the adapted Overview was preserved**

Open both Overview frames and compare them with the user's adapted layout. Confirm their custom structure, text, selection, positions, and styling remain unchanged. Export before/after screenshots if visual comparison is uncertain.

- [ ] **Step 7: Export verification PNGs without closing issue #18 prematurely**

Export the desktop and mobile Offer Detail frames as PNGs and attach them with the Figma link to issue #18. Keep issue #18 open until all six required final screen PNGs—Overview desktop/mobile, Offer Detail desktop/mobile, and Settings desktop/mobile—have been verified and attached.

## Self-Review Results

- Spec coverage: prominent disclosed imagery, original-offer access, recommendation reasons, rate, one-time payments, complete Golf comparison, selected-credit groups, score explanation, evidence/corrections, responsive behavior, illustrative-data disclosure, and Overview preservation each map to an explicit task.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step remains.
- Type consistency: `updateOfferDetailReferences`, `exactDescendant`, `overviewIdentity`, `assertReadableDetail`, `DETAIL_BUILD_STATUS_KEY`, and `DETAIL_BUILD_COMPLETE` use the same names in tests and implementation steps.
