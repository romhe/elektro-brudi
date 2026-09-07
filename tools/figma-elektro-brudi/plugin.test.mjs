import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(directory, 'manifest.json');
const pluginPath = path.join(directory, 'code.js');
const pluginSource = existsSync(pluginPath) ? readFileSync(pluginPath, 'utf8') : '';

function sourceSlice(startMarker, endMarker) {
  const start = pluginSource.indexOf(startMarker);
  const end = pluginSource.indexOf(endMarker, start + startMarker.length);
  return start >= 0 && end > start ? pluginSource.slice(start, end) : '';
}

const offerDetailFixtureSource = sourceSlice(
  'const OFFER_DETAIL = Object.freeze(',
  "\nif (typeof module !== 'undefined'",
);
const offerDetailHelpersSource = sourceSlice(
  'function listingImage(',
  '\nfunction buildOfferDetailReference(',
);
const offerDetailBuilderSource = sourceSlice(
  'function buildOfferDetailReference(',
  '\nfunction buildSettingsReference(',
);
const offerDetailRegionSource = [
  offerDetailFixtureSource,
  offerDetailHelpersSource,
  offerDetailBuilderSource,
].join('\n');

test('declares a local Figma design plugin with no network access', () => {
  assert.ok(existsSync(manifestPath), 'manifest.json must exist');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.name, 'ElektroBrudi Design Builder');
  assert.equal(manifest.main, 'code.js');
  assert.deepEqual(manifest.editorType, ['figma']);
  assert.equal(manifest.documentAccess, 'dynamic-page');
  assert.deepEqual(manifest.networkAccess, { allowedDomains: ['none'] });
});

test('locks the approved three-page Figma contract', () => {
  assert.ok(existsSync(pluginPath), 'code.js must exist');
  const require = createRequire(import.meta.url);
  const { contract } = require(pluginPath);

  assert.deepEqual(contract.pages, [
    '01 · Foundations & Guidelines',
    '02 · Components & States',
    '03 · Key Screens',
  ]);
  assert.deepEqual(contract.overviewFrames, [
    { name: 'Overview · Completed · Mixed verification', width: 1440, height: 1024 },
    { name: 'Overview · Completed · Mixed verification · Mobile', width: 390, height: 844 },
  ]);
  assert.deepEqual(contract.referenceSections, [
    'Offer detail · Pattern · Desktop',
    'Offer detail · Pattern · Mobile',
    'Settings · Pattern · Desktop',
    'Settings · Pattern · Mobile',
  ]);
});

test('covers the required components and state language', () => {
  assert.ok(existsSync(pluginPath), 'code.js must exist');
  const require = createRequire(import.meta.url);
  const { contract } = require(pluginPath);

  const requiredComponents = [
    'AppShell', 'TopNav', 'URLImport', 'JobProgress', 'StatusBadge',
    'SelectedOfferInspector', 'ReferenceDelta', 'OfferRow', 'OfferCard',
    'ScoreBreakdown', 'EvidenceDrawer', 'EquipmentStateControl',
    'FinanceScenarioCard', 'FormField', 'InlineAlert', 'ConfirmDialog',
    'ModelDownload',
  ];
  const requiredStates = [
    'EMPTY', 'VALID', 'INVALID', 'CRAWLING', 'WAITING_FOR_LOCAL_LLM',
    'COMPLETED', 'PARTIAL', 'FAILED', 'VERIFIED_AVAILABLE',
    'DISCOVERED_UNVERIFIED', 'PRESENT', 'ABSENT', 'UNKNOWN',
    'PREPARED_ONLY', 'SUBSCRIPTION_REQUIRED', 'FINANCE_ELIGIBLE',
    'FINANCE_INELIGIBLE', 'FINANCE_INVALID', 'KEYCHAIN_MISSING', 'OFFLINE',
  ];

  for (const name of requiredComponents) {
    assert.ok(contract.components.includes(name), `missing component ${name}`);
  }
  for (const name of requiredStates) {
    assert.ok(contract.states.includes(name), `missing state ${name}`);
  }
});

test('encodes the approved visual and product guardrails', () => {
  assert.ok(existsSync(pluginPath), 'code.js must exist');
  const require = createRequire(import.meta.url);
  const { contract } = require(pluginPath);

  assert.equal(contract.theme, 'light');
  assert.equal(contract.fontFamily, 'SF Pro');
  assert.equal(contract.desktopSidebarWidth, 232);
  assert.equal(contract.mobileMinimumTarget, 44);
  assert.equal(contract.financeWeight, 70);
  assert.equal(contract.equipmentWeight, 30);
  assert.equal(contract.verificationIsGate, true);
  assert.equal(contract.language, 'de-DE');
});

test('defines the table-first Overview contract', () => {
  const require = createRequire(import.meta.url);
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
  assert.deepEqual(contract.overviewOffers.map((offer) => offer.order), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(new Set(contract.overviewOffers.map((offer) => offer.order)).size, 7);
});

test('renders a table and selected-offer inspector on desktop', () => {
  assert.match(pluginSource, /Overview filters/);
  assert.match(pluginSource, /Offer comparison table/);
  assert.match(pluginSource, /SelectedOfferInspector/);
  assert.match(pluginSource, /Sort indicator/);
  assert.doesNotMatch(pluginSource, /desktopWinner\(left/);
});

test('keeps rank, filters, and selection details on mobile', () => {
  assert.match(pluginSource, /Mobile search and sort/);
  assert.match(pluginSource, /Rang 1/);
  assert.match(pluginSource, /Auswahl ansehen/);
  assert.match(pluginSource, /options\.stroke \|\| C\.border/);
  assert.match(pluginSource, /v6-visible-table-text/);
});

test('uses Inter instead of the non-rendering generic SF Pro family', () => {
  assert.match(pluginSource, /const preferredFamilies = \['SF Pro Text', 'SF Pro Display'\]/);
  assert.match(pluginSource, /const family = preferredFamily \|\| fallbackFamily/);
  assert.doesNotMatch(pluginSource, /preferredFamilies = \['SF Pro Text', 'SF Pro Display', 'SF Pro'\]/);
});

test('builds real variant sets and clickable prototype reactions', () => {
  assert.match(pluginSource, /figma\.combineAsVariants\(/);
  assert.match(pluginSource, /setReactionsAsync\(/);
  assert.match(pluginSource, /Overview Import · Prototype states/);
});

test('uses valid Figma auto-layout alignment values', () => {
  assert.doesNotMatch(pluginSource, /counterAlign:\s*['"]END['"]/);
});

test('preserves complete output but cleans incomplete generated roots', () => {
  assert.match(pluginSource, /prepareGeneratedTargets\(pages\)/);
  assert.match(pluginSource, /cleanupIncompleteGeneratedRoots\(pages\)/);
  assert.match(pluginSource, /Existing Overview focused/);
  assert.match(pluginSource, /if \(completeRoots\.length\)/);
  assert.match(pluginSource, /node\.getPluginData\(BUILD_STATUS_KEY\) !== BUILD_COMPLETE/);
});

test('focuses the primary desktop screen instead of the full key-screen board', () => {
  assert.match(pluginSource, /focusFrame = screens\.findOne/);
  assert.match(pluginSource, /node\.width === contract\.overviewFrames\[0\]\.width/);
  assert.match(pluginSource, /figma\.currentPage\.selection = \[focusFrame\]/);
  assert.match(pluginSource, /figma\.viewport\.scrollAndZoomIntoView\(\[focusFrame\]\)/);
  assert.doesNotMatch(pluginSource, /figma\.currentPage\.selection = \[screens\]/);
});

test('lays text out before assigning characters and falls back on zero bounds', () => {
  const textFunction = pluginSource.slice(
    pluginSource.indexOf('function text('),
    pluginSource.indexOf('\nfunction divider('),
  );
  assert.ok(
    textFunction.indexOf("node.textAutoResize = options.width ? 'HEIGHT' : 'WIDTH_AND_HEIGHT'") <
      textFunction.indexOf('node.characters = characters'),
    'text auto-resize must be configured before assigning characters',
  );
  assert.match(textFunction, /node\.width < 1 \|\| node\.height < 1/);
  assert.match(textFunction, /context\.fallbackFamily/);
});

test('makes the selected financing scenario understandable at a glance', () => {
  const requiredRegionLabels = [
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
  ];

  for (const label of requiredRegionLabels) {
    assert.ok(offerDetailRegionSource.includes(label), `missing Offer Detail label: ${label}`);
  }
  assert.match(offerDetailFixtureSource, /sourceDomain\s*:\s*['"]mobile\.de['"]/);
  assert.match(offerDetailHelpersSource, /Quelle: \$\{OFFER_DETAIL\.sourceDomain\}/);
  assert.match(offerDetailBuilderSource, /OFFER_DETAIL\.payment\./);
  assert.match(offerDetailBuilderSource, /OFFER_DETAIL\.comparison\./);
  assert.match(offerDetailBuilderSource, /OFFER_DETAIL\.finance\./);
  assert.doesNotMatch(offerDetailBuilderSource, /FINANCE_ELIGIBLE/);
});

test('distinguishes installment from effective monthly cost', () => {
  const requiredFixtureValues = [
    '499 € Monatsrate',
    '1.033 € / Monat',
    '1.104 € / Monat',
    '71 € / Monat günstiger',
  ];

  for (const value of requiredFixtureValues) {
    assert.ok(offerDetailFixtureSource.includes(value), `missing financing fixture value: ${value}`);
  }
  assert.match(offerDetailBuilderSource, /Anzahlung, Raten, Schlussrate, Gebühren, laufende Kosten und Restwert/);
  assert.match(offerDetailBuilderSource, /OFFER_DETAIL\.payment\./);
  assert.match(offerDetailBuilderSource, /OFFER_DETAIL\.comparison\./);
});

test('uses a prominent disclosed listing-media pattern', () => {
  const requiredHelperCopy = [
    'Listing image',
    'Kein Fahrzeugbild verfügbar',
    'Beispielfoto',
    'Originalangebot öffnen ↗',
  ];

  for (const copy of requiredHelperCopy) {
    assert.ok(offerDetailHelpersSource.includes(copy), `missing listing-media contract: ${copy}`);
  }
  assert.match(offerDetailFixtureSource, /sourceDomain\s*:\s*['"]mobile\.de['"]/);
  assert.match(offerDetailFixtureSource, /sourceUrl\s*:/);
  assert.match(offerDetailHelpersSource, /OFFER_DETAIL\.sourceUrl/);
  assert.match(offerDetailBuilderSource, /listingImage\s*\(/);
  assert.match(offerDetailBuilderSource, /listingSource\s*\(/);
});

test('shows the selected credit as aligned start, monthly, end, and total groups', () => {
  assert.ok(
    offerDetailHelpersSource.includes('`Finance group · ${title}`'),
    'financeGroup must name each rendered group',
  );
  for (const [title, key] of [['Start', 'start'], ['Monatlich', 'monthly'], ['Am Ende', 'end'], ['Gesamt', 'total']]) {
    const call = new RegExp(`financeGroup\\([^;]*['"]${title}['"][^;]*OFFER_DETAIL\\.finance\\.${key}`);
    assert.match(offerDetailBuilderSource, call, `missing financeGroup call for ${title}`);
  }
  assert.match(offerDetailBuilderSource, /Beispieldaten: Zins, Schlussrate und Gesamtkosten/);
  assert.match(offerDetailFixtureSource, /Hyundai Finance/);
  assert.match(offerDetailFixtureSource, /Ballonfinanzierung/);
});

test('updates only the two exact Offer Detail frames', () => {
  const updaterSource = sourceSlice(
    'function updateOfferDetailReferences(',
    '\nasync function build(',
  );
  const completedRootBranchSource = sourceSlice(
    '  if (completeRoots.length) {',
    '\n  await loadContext();\n  let foundations;',
  );
  const requiredUpdaterContract = [
    'contract.referenceSections[0]',
    'contract.referenceSections[1]',
    'Offer detail · updating · Desktop',
    'Offer detail · updating · Mobile',
    'Overview changed during Offer Detail update',
  ];

  assert.ok(updaterSource, 'missing updateOfferDetailReferences function');
  assert.ok(completedRootBranchSource, 'missing completed-root update branch');
  for (const value of requiredUpdaterContract) {
    assert.ok(updaterSource.includes(value), `missing targeted update contract: ${value}`);
  }
  assert.match(updaterSource, /const oldDesktop\s*=\s*exactDescendant\(root,\s*desktopName\)/);
  assert.match(updaterSource, /const oldMobile\s*=\s*exactDescendant\(root,\s*mobileName\)/);
  assert.match(updaterSource, /const protectedOverview\s*=\s*overviewIdentity\(root\)/);
  assert.match(updaterSource, /overviewIdentity\(root\)\s*!==\s*protectedOverview/);

  const desktopValidation = updaterSource.indexOf('assertReadableDetail(desktop');
  const mobileValidation = updaterSource.indexOf('assertReadableDetail(mobile');
  const overviewValidation = updaterSource.indexOf('overviewIdentity(root) !== protectedOverview');
  const desktopRemoval = updaterSource.indexOf('oldDesktop.remove()');
  const mobileRemoval = updaterSource.indexOf('oldMobile.remove()');
  for (const [name, position] of [
    ['desktop validation', desktopValidation],
    ['mobile validation', mobileValidation],
    ['Overview validation', overviewValidation],
    ['old desktop removal', desktopRemoval],
    ['old mobile removal', mobileRemoval],
  ]) {
    assert.ok(position >= 0, `missing ${name}`);
  }
  assert.ok(desktopValidation < desktopRemoval, 'desktop must be validated before old desktop removal');
  assert.ok(mobileValidation < desktopRemoval, 'mobile must be validated before old desktop removal');
  assert.ok(overviewValidation < desktopRemoval, 'Overview must be validated before old desktop removal');
  assert.ok(desktopValidation < mobileRemoval, 'desktop must be validated before old mobile removal');
  assert.ok(mobileValidation < mobileRemoval, 'mobile must be validated before old mobile removal');
  assert.ok(overviewValidation < mobileRemoval, 'Overview must be validated before old mobile removal');

  assert.match(completedRootBranchSource, /updateOfferDetailReferences\(existingScreens\)/);
  const updatePathSource = `${updaterSource}\n${completedRootBranchSource}`;
  assert.doesNotMatch(updatePathSource, /\bbuildKeyScreens\s*\(/);
  for (const target of ['root', 'existingScreens', 'protectedOverview']) {
    const destructiveCall = new RegExp(`\\b${target}\\s*\\.\\s*(?:remove|removeChild)\\s*\\(`);
    assert.doesNotMatch(updatePathSource, destructiveCall, `${target} must not be removed in the update path`);
  }
});
