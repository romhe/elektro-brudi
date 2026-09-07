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
  assert.match(pluginSource, /v4-table-overview-complete/);
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
