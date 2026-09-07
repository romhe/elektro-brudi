/*
 * ElektroBrudi Design Builder
 *
 * A deterministic, no-network development plugin for the existing ElektroBrudi
 * Figma file. It builds the approved three-page light-mode design language and
 * stops if generated roots already exist, so user work is never overwritten.
 */

const contract = Object.freeze({
  pages: [
    '01 · Foundations & Guidelines',
    '02 · Components & States',
    '03 · Key Screens',
  ],
  overviewFrames: [
    { name: 'Overview · Completed · Mixed verification', width: 1440, height: 1024 },
    { name: 'Overview · Completed · Mixed verification · Mobile', width: 390, height: 844 },
  ],
  overviewTableColumns: [
    'Rang', 'Fahrzeug', 'Verifikation', 'Kaufpreis', 'Kilometer',
    'Effektiv/Monat', 'Golf-Differenz', 'Finanzierung', 'Ausstattung',
    'Score', 'Aktualisiert', '',
  ],
  overviewFilters: ['Suche', 'Verifikation', 'Quelle', 'Finanzierung', 'Ausstattung'],
  overviewOffers: [
    { order: 1, vehicle: 'Hyundai IONIQ 5 · Techniq', source: 'Autohaus Nord', verification: 'verifiziert', verificationTone: 'success', price: '36.490 €', mileage: '22.900 km', monthly: '499 €', golfDelta: '− 71 €', finance: 'zulässig', financeTone: 'success', equipment: '25 / 30', score: '84', updated: 'vor 2 Min.' },
    { order: 2, vehicle: 'Kia EV6 · GT-Line', source: 'Kia Zentrum West', verification: 'verifiziert', verificationTone: 'success', price: '36.900 €', mileage: '24.800 km', monthly: '512 €', golfDelta: '− 58 €', finance: 'zulässig', financeTone: 'success', equipment: '27 / 30', score: '82', updated: 'vor 5 Min.' },
    { order: 3, vehicle: 'VW ID.4 · Pro', source: 'mobile.de', verification: 'ungeprüft', verificationTone: 'warning', price: '34.750 €', mileage: '31.200 km', monthly: '486 €', golfDelta: '− 84 €', finance: 'prüfen', financeTone: 'warning', equipment: '18 / 30', score: '76', updated: 'vor 8 Min.' },
    { order: 4, vehicle: 'Tesla Model Y · LR', source: 'EV Store Berlin', verification: 'teilweise', verificationTone: 'warning', price: '39.490 €', mileage: '18.100 km', monthly: '548 €', golfDelta: '− 22 €', finance: 'zulässig', financeTone: 'success', equipment: '22 / 30', score: '71', updated: 'vor 12 Min.' },
    { order: 5, vehicle: 'Škoda Enyaq · 80', source: 'Škoda Partner Süd', verification: 'verifiziert', verificationTone: 'success', price: '37.950 €', mileage: '27.400 km', monthly: '531 €', golfDelta: '− 39 €', finance: 'zulässig', financeTone: 'success', equipment: '23 / 30', score: '69', updated: 'vor 18 Min.' },
    { order: 6, vehicle: 'CUPRA Born · 77 kWh', source: 'mobile.de', verification: 'ungeprüft', verificationTone: 'warning', price: '33.890 €', mileage: '29.600 km', monthly: '477 €', golfDelta: '− 93 €', finance: 'prüfen', financeTone: 'warning', equipment: '16 / 30', score: '64', updated: 'vor 24 Min.' },
    { order: 7, vehicle: 'VW ID.3 · Pro S', source: 'Autohaus Mitte', verification: 'verifiziert', verificationTone: 'success', price: '32.990 €', mileage: '41.200 km', monthly: '468 €', golfDelta: '− 102 €', finance: 'unzulässig', financeTone: 'error', equipment: '19 / 30', score: '58', updated: 'vor 31 Min.' },
  ],
  referenceSections: [
    'Offer detail · Pattern · Desktop',
    'Offer detail · Pattern · Mobile',
    'Settings · Pattern · Desktop',
    'Settings · Pattern · Mobile',
  ],
  components: [
    'AppShell', 'TopNav', 'URLImport', 'JobProgress', 'StatusBadge',
    'SelectedOfferInspector', 'ReferenceDelta', 'OfferRow', 'OfferCard',
    'ScoreBreakdown', 'EvidenceDrawer', 'EquipmentStateControl',
    'FinanceScenarioCard', 'FormField', 'InlineAlert', 'ConfirmDialog',
    'ModelDownload',
  ],
  states: [
    'EMPTY', 'VALID', 'INVALID', 'CRAWLING', 'WAITING_FOR_LOCAL_LLM',
    'COMPLETED', 'PARTIAL', 'FAILED', 'VERIFIED_AVAILABLE',
    'DISCOVERED_UNVERIFIED', 'PRESENT', 'ABSENT', 'UNKNOWN',
    'PREPARED_ONLY', 'SUBSCRIPTION_REQUIRED', 'FINANCE_ELIGIBLE',
    'FINANCE_INELIGIBLE', 'FINANCE_INVALID', 'KEYCHAIN_MISSING', 'OFFLINE',
  ],
  theme: 'light',
  fontFamily: 'SF Pro',
  desktopSidebarWidth: 232,
  mobileMinimumTarget: 44,
  financeWeight: 70,
  equipmentWeight: 30,
  verificationIsGate: true,
  language: 'de-DE',
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { contract };
}

const C = {
  app: '#F5F5F7',
  sidebar: '#ECECEF',
  surface: '#FFFFFF',
  subtle: '#F4F4F6',
  border: '#D8D8DD',
  text: '#1D1D1F',
  secondary: '#6E6E73',
  accent: '#007AFF',
  accentHover: '#0066D6',
  success: '#248A3D',
  successBg: '#EAF7ED',
  warning: '#9A6700',
  warningBg: '#FFF4D6',
  error: '#D70015',
  errorBg: '#FDEBEC',
  info: '#0A6CCB',
  infoBg: '#EAF3FC',
  violet: '#6E5AE6',
};

const GENERATED_ROOTS = [
  '[ElektroBrudi] Foundations & Guidelines',
  '[ElektroBrudi] Components & States',
  '[ElektroBrudi] Key Screens',
];
const BUILD_STATUS_KEY = 'elektro-brudi-build-status';
const BUILD_COMPLETE = 'v5-table-overview-focused';

function rgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

/** @returns {SolidPaint} */
function solid(hex, opacity = 1) {
  return { type: 'SOLID', color: rgb(hex), opacity };
}

function fontStyle(weight) {
  if (weight >= 700) return 'Bold';
  if (weight >= 600) return 'Semibold';
  if (weight >= 500) return 'Medium';
  return 'Regular';
}

function append(parent, child) {
  parent.appendChild(child);
  return child;
}

function frame(parent, name, options = {}) {
  const node = figma.createFrame();
  node.name = name;
  node.clipsContent = options.clipsContent === true;
  node.resize(options.width || 100, options.height || 100);
  if (options.x !== undefined) node.x = options.x;
  if (options.y !== undefined) node.y = options.y;
  if (options.fill) node.fills = [solid(options.fill, options.opacity || 1)];
  else node.fills = [];
  if (options.stroke) {
    node.strokes = [solid(options.stroke)];
    node.strokeWeight = options.strokeWeight || 1;
    node.strokeAlign = 'INSIDE';
  }
  if (options.radius !== undefined) node.cornerRadius = options.radius;
  if (options.shadow) {
    node.effects = [{
      type: 'DROP_SHADOW',
      color: { ...rgb('#000000'), a: 0.10 },
      offset: { x: 0, y: 8 },
      radius: 24,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL',
    }];
  }
  append(parent, node);
  return node;
}

function auto(parent, name, direction, options = {}) {
  const node = frame(parent, name, options);
  node.layoutMode = direction;
  node.primaryAxisAlignItems = options.primaryAlign || 'MIN';
  node.counterAxisAlignItems = options.counterAlign || 'MIN';
  node.itemSpacing = options.gap || 0;
  const padding = options.padding || 0;
  node.paddingTop = options.paddingTop !== undefined ? options.paddingTop : padding;
  node.paddingRight = options.paddingRight !== undefined ? options.paddingRight : padding;
  node.paddingBottom = options.paddingBottom !== undefined ? options.paddingBottom : padding;
  node.paddingLeft = options.paddingLeft !== undefined ? options.paddingLeft : padding;
  if (direction === 'VERTICAL') {
    node.primaryAxisSizingMode = options.height ? 'FIXED' : 'AUTO';
    node.counterAxisSizingMode = options.width ? 'FIXED' : 'AUTO';
  } else {
    node.primaryAxisSizingMode = options.width ? 'FIXED' : 'AUTO';
    node.counterAxisSizingMode = options.height ? 'FIXED' : 'AUTO';
  }
  return node;
}

function applyVariablePaint(node, property, variableName, fallback) {
  const variable = context.variables.get(variableName);
  /** @type {SolidPaint} */
  let paint = solid(fallback);
  if (variable) paint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
  node[property] = [paint];
}

function applyVariableNumber(node, property, variableName, fallback) {
  const variable = context.variables.get(variableName);
  node[property] = fallback;
  if (variable && typeof node.setBoundVariable === 'function') {
    try { node.setBoundVariable(property, variable); } catch (_) { /* unsupported property */ }
  }
}

function text(parent, characters, options = {}) {
  const node = figma.createText();
  node.name = options.name || characters.slice(0, 48) || 'Text';
  const weight = options.weight || 400;
  const size = options.size || 14;
  const lineHeight = options.lineHeight || Math.round(size * 1.35);
  node.fontName = { family: context.fontFamily, style: context.fonts[fontStyle(weight)] };
  node.fontSize = size;
  node.lineHeight = { unit: 'PIXELS', value: lineHeight };
  node.letterSpacing = { unit: 'PERCENT', value: options.tracking || 0 };
  if (options.width) node.resize(options.width, lineHeight);
  node.textAutoResize = options.width ? 'HEIGHT' : 'WIDTH_AND_HEIGHT';
  node.characters = characters;
  node.fills = [solid(options.color || C.text)];
  if (options.align) node.textAlignHorizontal = options.align;
  if ((node.width < 1 || node.height < 1) && context.fallbackFamily) {
    node.fontName = { family: context.fallbackFamily, style: context.fallbackFonts[fontStyle(weight)] };
    node.characters = '';
    node.characters = characters;
  }
  if (node.width < 1 || node.height < 1) {
    throw new Error(`Text layout failed for “${characters.slice(0, 32)}”.`);
  }
  append(parent, node);
  return node;
}

function divider(parent, width) {
  return frame(parent, 'Divider', { width, height: 1, fill: C.border });
}

function dot(parent, color, size = 10) {
  const node = figma.createEllipse();
  node.name = 'Indicator';
  node.resize(size, size);
  node.fills = [solid(color)];
  append(parent, node);
  return node;
}

function iconBox(parent, glyph, options = {}) {
  const size = options.box || 32;
  const box = auto(parent, options.name || `Icon · ${glyph}`, 'HORIZONTAL', {
    width: size, height: size, fill: options.fill || C.subtle, radius: options.radius || 8,
    primaryAlign: 'CENTER', counterAlign: 'CENTER',
  });
  text(box, glyph, { size: options.size || 15, weight: 600, color: options.color || C.text });
  return box;
}

function badge(parent, label, tone = 'neutral') {
  const tones = {
    neutral: [C.subtle, C.secondary],
    success: [C.successBg, C.success],
    warning: [C.warningBg, C.warning],
    error: [C.errorBg, C.error],
    info: [C.infoBg, C.info],
  };
  const [background, foreground] = tones[tone] || tones.neutral;
  const node = auto(parent, `StatusBadge · ${label}`, 'HORIZONTAL', {
    height: 28, fill: background, radius: 14, gap: 6,
    paddingLeft: 10, paddingRight: 10, primaryAlign: 'CENTER', counterAlign: 'CENTER',
  });
  dot(node, foreground, 7);
  text(node, label, { size: 12, weight: 600, color: foreground, lineHeight: 15 });
  return node;
}

function button(parent, label, options = {}) {
  const node = auto(parent, options.name || `Button · ${label}`, 'HORIZONTAL', {
    height: options.height || 36,
    fill: options.kind === 'secondary' ? C.surface : (options.kind === 'danger' ? C.error : C.accent),
    stroke: options.kind === 'secondary' ? C.border : undefined,
    radius: options.radius || 9,
    paddingLeft: options.paddingX || 14,
    paddingRight: options.paddingX || 14,
    gap: 7,
    primaryAlign: 'CENTER', counterAlign: 'CENTER',
  });
  if (options.icon) text(node, options.icon, { size: 14, weight: 600, color: options.kind === 'secondary' ? C.text : C.surface });
  text(node, label, { size: 13, weight: 600, color: options.kind === 'secondary' ? C.text : C.surface, lineHeight: 17 });
  return node;
}

function card(parent, name, options = {}) {
  return auto(parent, name, 'VERTICAL', {
    width: options.width,
    height: options.height,
    fill: options.fill || C.surface,
    stroke: options.stroke === false ? undefined : (options.stroke || C.border),
    radius: options.radius || 14,
    padding: options.padding === undefined ? 20 : options.padding,
    gap: options.gap === undefined ? 12 : options.gap,
    shadow: options.shadow || false,
  });
}

function sectionHeader(parent, eyebrow, title, description, width) {
  const group = auto(parent, `${title} · Header`, 'VERTICAL', { width, gap: 6 });
  text(group, eyebrow.toUpperCase(), { size: 11, weight: 600, color: C.accent, tracking: 8, lineHeight: 14 });
  text(group, title, { size: 28, weight: 700, lineHeight: 34 });
  if (description) text(group, description, { size: 14, color: C.secondary, width, lineHeight: 20 });
  return group;
}

function metric(parent, label, value, detail, width = 220) {
  const node = card(parent, `Metric · ${label}`, { width, padding: 16, gap: 5 });
  text(node, label, { size: 12, weight: 600, color: C.secondary });
  text(node, value, { size: 27, weight: 700, lineHeight: 32 });
  text(node, detail, { size: 12, color: C.secondary, width: width - 32, lineHeight: 16 });
  return node;
}

function callout(parent, title, body, tone = 'info', width = 420) {
  const colors = tone === 'warning' ? [C.warningBg, C.warning] : tone === 'error' ? [C.errorBg, C.error] : [C.infoBg, C.info];
  const node = auto(parent, `InlineAlert · ${tone}`, 'HORIZONTAL', {
    width, fill: colors[0], radius: 10, padding: 12, gap: 10, counterAlign: 'MIN',
  });
  iconBox(node, tone === 'warning' ? '!' : tone === 'error' ? '×' : 'i', { box: 24, fill: colors[1], color: C.surface, radius: 12, size: 12 });
  const copy = auto(node, 'Copy', 'VERTICAL', { width: width - 70, gap: 3 });
  text(copy, title, { size: 13, weight: 600, color: C.text, width: width - 70 });
  text(copy, body, { size: 12, color: C.secondary, width: width - 70, lineHeight: 17 });
  return node;
}

function inputField(parent, label, value, state = 'default', width = 420) {
  const group = auto(parent, `FormField · ${state}`, 'VERTICAL', { width, gap: 6 });
  text(group, label, { size: 12, weight: 600, color: C.secondary });
  const field = auto(group, 'Input', 'HORIZONTAL', {
    width, height: 40, fill: C.surface,
    stroke: state === 'error' ? C.error : state === 'focus' ? C.accent : C.border,
    strokeWeight: state === 'focus' ? 2 : 1,
    radius: 9, paddingLeft: 12, paddingRight: 12, counterAlign: 'CENTER',
  });
  text(field, value, { size: 13, color: value ? C.text : C.secondary, width: width - 24 });
  if (state === 'error') text(group, 'Bitte eine gültige mobile.de URL eingeben.', { size: 11, color: C.error, width });
  return group;
}

function trafficLights(parent) {
  const lights = auto(parent, 'Window controls', 'HORIZONTAL', { gap: 8, counterAlign: 'CENTER' });
  dot(lights, '#FF5F57', 12);
  dot(lights, '#FEBC2E', 12);
  dot(lights, '#28C840', 12);
  return lights;
}

function navItem(parent, icon, label, selected = false) {
  const item = auto(parent, `Nav · ${label}`, 'HORIZONTAL', {
    width: 200, height: 38, fill: selected ? '#D9EAFB' : C.sidebar,
    radius: 8, paddingLeft: 10, paddingRight: 10, gap: 10, counterAlign: 'CENTER',
  });
  text(item, icon, { size: 15, weight: 600, color: selected ? C.accent : C.secondary });
  text(item, label, { size: 13, weight: selected ? 600 : 500, color: selected ? C.text : C.secondary });
  return item;
}

function buildSidebar(parent, selected, height, mobile = false) {
  if (mobile) return null;
  const sidebar = auto(parent, 'Sidebar', 'VERTICAL', {
    width: contract.desktopSidebarWidth, height, fill: C.sidebar,
    paddingTop: 18, paddingLeft: 16, paddingRight: 16, paddingBottom: 16, gap: 12,
  });
  trafficLights(sidebar);
  const brand = auto(sidebar, 'Brand', 'HORIZONTAL', { width: 200, gap: 10, paddingTop: 8, paddingBottom: 10, counterAlign: 'CENTER' });
  iconBox(brand, 'E', { box: 34, fill: C.accent, color: C.surface, radius: 9 });
  const brandCopy = auto(brand, 'Brand copy', 'VERTICAL', { gap: 1 });
  text(brandCopy, 'ElektroBrudi', { size: 14, weight: 700 });
  text(brandCopy, 'Kaufentscheidung', { size: 10, color: C.secondary });
  divider(sidebar, 200);
  navItem(sidebar, '⌂', 'Übersicht', selected === 'Übersicht');
  navItem(sidebar, '＋', 'Angebot importieren', selected === 'Import');
  navItem(sidebar, '⇩', 'Modelle', selected === 'Modelle');
  navItem(sidebar, '⚙', 'Einstellungen', selected === 'Einstellungen');
  const spacer = frame(sidebar, 'Flexible spacer', { width: 1, height: Math.max(40, height - 350) });
  spacer.layoutGrow = 1;
  callout(sidebar, 'Lokal & privat', 'Angebote und Modellbewertung bleiben auf diesem Mac.', 'info', 200);
  return sidebar;
}

function topNav(parent, title, subtitle, width, mobile = false) {
  const bar = auto(parent, 'TopNav', 'HORIZONTAL', {
    width, height: mobile ? 60 : 64, fill: C.surface,
    paddingLeft: mobile ? 16 : 28, paddingRight: mobile ? 16 : 28,
    primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER',
  });
  const left = auto(bar, 'Title', 'VERTICAL', { gap: 1 });
  text(left, title, { size: mobile ? 17 : 19, weight: 700, lineHeight: 23 });
  if (!mobile && subtitle) text(left, subtitle, { size: 11, color: C.secondary });
  const right = auto(bar, 'Actions', 'HORIZONTAL', { gap: 8, counterAlign: 'CENTER' });
  if (mobile) iconBox(right, '≡', { box: 36, fill: C.subtle, radius: 9 });
  else {
    badge(right, 'Lokales Modell bereit', 'success');
    iconBox(right, '⌘', { box: 34, fill: C.subtle, radius: 9 });
  }
  return bar;
}

function bindSemanticTokens(root) {
  const mapping = [
    ['background/app', C.app], ['background/sidebar', C.sidebar],
    ['surface/primary', C.surface], ['surface/subtle', C.subtle],
    ['border/default', C.border], ['text/primary', C.text],
    ['text/secondary', C.secondary], ['action/primary', C.accent],
  ];
  for (const node of root.findAll((candidate) => candidate.type === 'FRAME')) {
    if (!Array.isArray(node.fills) || node.fills.length !== 1 || node.fills[0].type !== 'SOLID') continue;
    const color = node.fills[0].color;
    for (const [name, hex] of mapping) {
      const expected = rgb(hex);
      if (Math.abs(color.r - expected.r) < 0.002 && Math.abs(color.g - expected.g) < 0.002 && Math.abs(color.b - expected.b) < 0.002) {
        applyVariablePaint(node, 'fills', name, hex);
        break;
      }
    }
  }
}

function foundationColor(parent, name, value, token, width = 230) {
  const row = auto(parent, `Color · ${name}`, 'HORIZONTAL', { width, gap: 10, counterAlign: 'CENTER' });
  frame(row, 'Swatch', { width: 38, height: 38, fill: value, stroke: value === C.surface ? C.border : undefined, radius: 9 });
  const copy = auto(row, 'Copy', 'VERTICAL', { gap: 1 });
  text(copy, name, { size: 12, weight: 600 });
  text(copy, `${token}  ·  ${value}`, { size: 10, color: C.secondary });
}

function buildFoundations(page) {
  const root = auto(page, GENERATED_ROOTS[0], 'VERTICAL', {
    x: 0, y: 0, width: 1440, fill: C.app, padding: 64, gap: 48,
  });
  root.minHeight = 2600;
  const hero = auto(root, 'Introduction', 'HORIZONTAL', {
    width: 1312, fill: C.surface, radius: 20, padding: 32, gap: 48,
    primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER', shadow: true,
  });
  const intro = auto(hero, 'Intro copy', 'VERTICAL', { width: 780, gap: 10 });
  badge(intro, 'Light mode · macOS-native', 'info');
  text(intro, 'ElektroBrudi Design Language', { size: 38, weight: 700, lineHeight: 44 });
  text(intro, 'Ein ruhiges Decision Cockpit für nachvollziehbare Elektroauto-Kaufentscheidungen — dicht genug für Vergleiche, vertraut genug für den Mac.', { size: 17, color: C.secondary, width: 760, lineHeight: 25 });
  const principles = auto(hero, 'Principles', 'VERTICAL', { width: 360, gap: 8 });
  text(principles, 'DESIGNPRINZIPIEN', { size: 11, weight: 600, color: C.accent, tracking: 8 });
  ['Antwort zuerst', 'Belege vor Behauptungen', 'Status nie nur über Farbe', 'Lokale Daten sichtbar schützen'].forEach((label, index) => {
    const row = auto(principles, `Principle ${index + 1}`, 'HORIZONTAL', { width: 360, gap: 10, counterAlign: 'CENTER' });
    iconBox(row, String(index + 1), { box: 26, fill: C.subtle, color: C.accent, radius: 8, size: 11 });
    text(row, label, { size: 13, weight: 600 });
  });

  const colors = auto(root, 'Color system', 'VERTICAL', { width: 1312, gap: 18 });
  sectionHeader(colors, '01 · Foundations', 'Farbe', 'Semantische Rollen halten Status, Interaktion und Verifikation konsistent. Light mode ist die einzige Theme-Variante.', 900);
  const colorGrid = auto(colors, 'Color grid', 'HORIZONTAL', { width: 1312, gap: 16 });
  /** @type {Array<[string, Array<[string, string, string]>]>} */
  const groups = [
    ['Flächen', [['App', C.app, 'background/app'], ['Sidebar', C.sidebar, 'background/sidebar'], ['Primary', C.surface, 'surface/primary'], ['Subtle', C.subtle, 'surface/subtle']]],
    ['Inhalt', [['Text', C.text, 'text/primary'], ['Secondary', C.secondary, 'text/secondary'], ['Border', C.border, 'border/default'], ['Action', C.accent, 'action/primary']]],
    ['Status', [['Verfügbar', C.success, 'status/success'], ['Ungeprüft', C.warning, 'status/warning'], ['Fehler', C.error, 'status/error'], ['Info', C.info, 'status/info']]],
  ];
  for (const [title, values] of groups) {
    const group = card(colorGrid, `Palette · ${title}`, { width: 426, padding: 18, gap: 12 });
    text(group, title, { size: 15, weight: 700 });
    values.forEach(([name, value, token]) => foundationColor(group, name, value, token, 390));
  }

  const typeAndSpace = auto(root, 'Typography and spacing', 'HORIZONTAL', { width: 1312, gap: 24 });
  const typography = card(typeAndSpace, 'Typography', { width: 820, padding: 24, gap: 16 });
  sectionHeader(typography, '02 · Voice', 'Typografie', 'SF Pro unterstützt die native macOS-Anmutung. Zahlen bleiben prominent, Labels sachlich.', 740);
  /** @type {Array<[string, string, number, number]>} */
  const specimens = [
    ['Page title', 'Kaufentscheidung', 32, 700],
    ['Section', 'Die besten Angebote', 22, 700],
    ['Card', 'Hyundai IONIQ 5', 17, 600],
    ['Body', 'Finanzielle Passung und Ausstattung werden getrennt bewertet.', 14, 400],
    ['Data', '84 / 100', 28, 700],
    ['Label', 'VERIFIZIERT VERFÜGBAR', 11, 600],
  ];
  for (const [label, sample, size, weight] of specimens) {
    const row = auto(typography, `Type · ${label}`, 'HORIZONTAL', { width: 772, gap: 24, counterAlign: 'CENTER' });
    text(row, label, { size: 11, color: C.secondary, width: 100 });
    text(row, sample, { size, weight, width: 520, lineHeight: Math.round(size * 1.3) });
    text(row, `${size}px`, { size: 11, color: C.secondary, width: 60, align: 'RIGHT' });
  }
  const spacing = card(typeAndSpace, 'Spacing & geometry', { width: 468, padding: 24, gap: 14 });
  sectionHeader(spacing, '03 · Rhythm', 'Raum & Form', '4er-Raster, kompakte Kontrollen, großzügige Inhaltsgruppen.', 400);
  [4, 8, 12, 16, 24, 32, 48].forEach((value) => {
    const row = auto(spacing, `Space ${value}`, 'HORIZONTAL', { width: 420, gap: 12, counterAlign: 'CENTER' });
    text(row, String(value), { size: 11, color: C.secondary, width: 24 });
    frame(row, 'Scale', { width: value * 4, height: 8, fill: C.accent, radius: 4 });
  });
  const radii = auto(spacing, 'Radii', 'HORIZONTAL', { gap: 12 });
  [8, 10, 14, 20].forEach((value) => {
    const sample = auto(radii, `Radius ${value}`, 'VERTICAL', { width: 88, height: 64, fill: C.subtle, radius: value, primaryAlign: 'CENTER', counterAlign: 'CENTER' });
    text(sample, `r ${value}`, { size: 11, weight: 600, color: C.secondary });
  });

  const language = auto(root, 'Status and content language', 'VERTICAL', { width: 1312, gap: 18 });
  sectionHeader(language, '04 · Product truth', 'Status- und Inhaltslogik', 'Verifikation ist ein Gate. Unbekannt ist ein legitimer Zustand; entdeckt bedeutet nicht bestätigt.', 900);
  const statusRow = auto(language, 'Status examples', 'HORIZONTAL', { width: 1312, gap: 12 });
  badge(statusRow, 'Verifiziert verfügbar', 'success');
  badge(statusRow, 'Entdeckt · ungeprüft', 'warning');
  badge(statusRow, 'Nicht vorhanden', 'error');
  badge(statusRow, 'Unbekannt', 'neutral');
  badge(statusRow, 'Offline', 'error');
  const rules = auto(language, 'Rules', 'HORIZONTAL', { width: 1312, gap: 16 });
  callout(rules, 'Verifikation ist ein Gate', 'Nur verifizierte Daten dürfen eine endgültige Empfehlung begründen.', 'info', 426);
  callout(rules, 'Finanzierung: 70 Punkte', 'Monatsrate, Laufzeit und Gesamtkosten dominieren die Rangfolge.', 'warning', 426);
  callout(rules, 'Ausstattung: 30 Punkte', 'PRESENT, ABSENT und UNKNOWN bleiben im Vergleich unterscheidbar.', 'info', 426);

  const usage = auto(root, 'Usage guidance', 'HORIZONTAL', { width: 1312, gap: 24 });
  const responsive = card(usage, 'Responsive', { width: 644, padding: 24, gap: 12 });
  sectionHeader(responsive, '05 · Layout', 'Responsive Verhalten', 'Desktop nutzt die 232px Sidebar; Mobile wird zu einer fokussierten Einspalten-Ansicht.', 570);
  ['Desktop: Sidebar + Arbeitsfläche', 'Mobile: Navigation im Top Bar-Menü', 'Primäre Aktionen bleiben sichtbar', 'Tabellen werden zu OfferCards'].forEach((rule) => {
    const row = auto(responsive, rule, 'HORIZONTAL', { width: 580, gap: 10, counterAlign: 'CENTER' });
    iconBox(row, '✓', { box: 24, fill: C.successBg, color: C.success, radius: 12, size: 11 });
    text(row, rule, { size: 13, weight: 500 });
  });
  const access = card(usage, 'Accessibility', { width: 644, padding: 24, gap: 12 });
  sectionHeader(access, '06 · Inclusive', 'Barrierefreiheit', 'Lesbarkeit und Bedienbarkeit gehören zum visuellen Vertrag.', 570);
  ['Mobile Touch-Ziele mindestens 44 × 44px', 'Status zusätzlich mit Text und Symbol', 'Kontrastziel WCAG AA', 'Fokus sichtbar, Reihenfolge logisch'].forEach((rule) => {
    const row = auto(access, rule, 'HORIZONTAL', { width: 580, gap: 10, counterAlign: 'CENTER' });
    iconBox(row, '⌁', { box: 24, fill: C.infoBg, color: C.info, radius: 12, size: 11 });
    text(row, rule, { size: 13, weight: 500 });
  });
  bindSemanticTokens(root);
  return root;
}

function componentLabel(parent, name, description) {
  const label = auto(parent, `${name} · Documentation`, 'VERTICAL', { width: 390, gap: 4 });
  text(label, name, { size: 17, weight: 700 });
  text(label, description, { size: 12, color: C.secondary, width: 390, lineHeight: 17 });
  return label;
}

function componentBase(parent, name, width = 520) {
  const component = figma.createComponent();
  component.name = name;
  component.resize(width, 100);
  component.layoutMode = 'VERTICAL';
  component.primaryAxisSizingMode = 'AUTO';
  component.counterAxisSizingMode = 'FIXED';
  component.itemSpacing = 8;
  component.paddingTop = 12;
  component.paddingRight = 12;
  component.paddingBottom = 12;
  component.paddingLeft = 12;
  component.cornerRadius = 12;
  component.fills = [solid(C.surface)];
  component.strokes = [solid(C.border)];
  component.strokeAlign = 'INSIDE';
  append(parent, component);
  return component;
}

function documentedComponent(parent, name, description, builder, width = 520) {
  const row = auto(parent, `Component · ${name}`, 'HORIZONTAL', { width: 1248, gap: 40, counterAlign: 'MIN' });
  componentLabel(row, name, description);
  const sample = componentBase(row, name, width);
  builder(sample);
  return sample;
}

function stateStrip(parent, entries, width = 520) {
  const strip = auto(parent, 'States', 'HORIZONTAL', { width, gap: 8, counterAlign: 'CENTER' });
  entries.forEach(([label, tone]) => badge(strip, label, tone));
  return strip;
}

function componentVariants(parent, family, variants, renderer, componentWidth = 190) {
  const holder = auto(parent, `${family} · Variant showcase`, 'HORIZONTAL', {
    width: 1248, gap: 12, paddingLeft: 430, counterAlign: 'MIN',
  });
  const components = variants.map((variant) => {
    const component = componentBase(holder, `State=${variant}`, componentWidth);
    component.name = `State=${variant}`;
    renderer(component, variant);
    return component;
  });
  const set = figma.combineAsVariants(components, holder);
  set.name = family;
  set.layoutMode = 'HORIZONTAL';
  set.primaryAxisSizingMode = 'AUTO';
  set.counterAxisSizingMode = 'AUTO';
  set.itemSpacing = 12;
  set.paddingTop = 12;
  set.paddingRight = 12;
  set.paddingBottom = 12;
  set.paddingLeft = 12;
  set.cornerRadius = 14;
  set.fills = [solid(C.subtle)];
  return set;
}

function buildComponents(page) {
  const root = auto(page, GENERATED_ROOTS[1], 'VERTICAL', { x: 0, y: 0, width: 1440, fill: C.app, padding: 64, gap: 36 });
  sectionHeader(root, 'ElektroBrudi library', 'Components & States', 'Produktionsnahe Bausteine, benannt nach ihrem Zweck. Varianten zeigen die Zustände, die HTML-Mockups später übernehmen.', 980);

  documentedComponent(root, 'AppShell', '232px Sidebar, native window controls und flexible Arbeitsfläche.', (c) => {
    const shell = auto(c, 'Mini shell', 'HORIZONTAL', { width: 496, height: 160, fill: C.app, radius: 8 });
    const side = auto(shell, 'Sidebar', 'VERTICAL', { width: 112, height: 160, fill: C.sidebar, padding: 10, gap: 7 });
    trafficLights(side); navItem(side, '⌂', 'Übersicht', true).resize(92, 32);
    const main = auto(shell, 'Workspace', 'VERTICAL', { width: 384, height: 160, fill: C.surface, padding: 14, gap: 8 });
    text(main, 'Kaufentscheidung', { size: 16, weight: 700 }); frame(main, 'Content', { width: 340, height: 76, fill: C.subtle, radius: 8 });
  });
  documentedComponent(root, 'TopNav', 'Kontexttitel, lokaler Systemstatus und sekundäre Aktionen.', (c) => topNav(c, 'Kaufentscheidung', 'Zuletzt aktualisiert vor 2 Minuten', 496));
  documentedComponent(root, 'URLImport', 'URL-Eingabe mit EMPTY, VALID und INVALID.', (c) => {
    inputField(c, 'Angebots-URL', 'https://suchen.mobile.de/fahrzeuge/details.html?id=…', 'focus', 496);
    stateStrip(c, [['EMPTY', 'neutral'], ['VALID', 'success'], ['INVALID', 'error']], 496);
  });
  documentedComponent(root, 'JobProgress', 'Transparenter Importfortschritt inklusive lokaler Modellphase.', (c) => {
    const row = auto(c, 'Progress', 'HORIZONTAL', { width: 496, gap: 10, counterAlign: 'CENTER' });
    iconBox(row, '↻', { box: 30, fill: C.infoBg, color: C.info });
    const copy = auto(row, 'Copy', 'VERTICAL', { gap: 2 });
    text(copy, 'Lokales Modell bewertet Ausstattung', { size: 13, weight: 600 });
    text(copy, 'Schritt 3 von 4 · etwa 20 Sekunden', { size: 11, color: C.secondary });
    stateStrip(c, [['CRAWLING', 'info'], ['WAITING', 'warning'], ['COMPLETED', 'success']], 496);
    stateStrip(c, [['PARTIAL', 'warning'], ['FAILED', 'error']], 496);
  });
  documentedComponent(root, 'StatusBadge', 'Kompakter Zustand mit Text, Punkt und semantischem Ton.', (c) => {
    stateStrip(c, [['VERIFIED', 'success'], ['UNVERIFIED', 'warning'], ['UNKNOWN', 'neutral']], 496);
    stateStrip(c, [['OFFLINE', 'error'], ['KEYCHAIN_MISSING', 'error']], 496);
  });
  documentedComponent(root, 'SelectedOfferInspector', 'Kompakte Details zur gewählten Tabellenzeile ohne Seitenwechsel.', (c) => {
    const status = auto(c, 'Selection status', 'HORIZONTAL', { width: 496, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
    badge(status, 'Rang 1', 'success'); badge(status, 'verifiziert', 'success');
    text(c, 'Hyundai IONIQ 5 · Techniq', { size: 19, weight: 700 });
    const values = auto(c, 'Decision values', 'HORIZONTAL', { width: 496, gap: 8 });
    badge(values, '499 € / Monat', 'info'); badge(values, '− 71 € ggü. Golf', 'success');
    button(c, 'Details öffnen', { kind: 'secondary' });
  });
  documentedComponent(root, 'ReferenceDelta', 'Erklärt die Abweichung zur Referenz statt nur Zahlen zu zeigen.', (c) => {
    const row = auto(c, 'Delta row', 'HORIZONTAL', { width: 496, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
    const left = auto(row, 'Copy', 'VERTICAL', { gap: 2 }); text(left, 'Gesamtkosten', { size: 13, weight: 600 }); text(left, 'gegen Referenzangebot', { size: 11, color: C.secondary });
    badge(row, '− 2.840 €', 'success');
  });
  documentedComponent(root, 'OfferRow', 'Dichte Desktop-Zeile mit Rang, Datenqualität und Entscheidung.', (c) => {
    const row = auto(c, 'Offer row', 'HORIZONTAL', { width: 496, gap: 12, counterAlign: 'CENTER' });
    iconBox(row, '1', { box: 30, fill: C.successBg, color: C.success });
    const copy = auto(row, 'Offer', 'VERTICAL', { width: 210, gap: 2 }); text(copy, 'Kia EV6 GT-Line', { size: 13, weight: 600 }); text(copy, '36.900 € · 24.800 km', { size: 11, color: C.secondary });
    badge(row, 'verifiziert', 'success'); text(row, '82', { size: 20, weight: 700 });
  });
  documentedComponent(root, 'OfferCard', 'Mobile Entsprechung der OfferRow mit mindestens 44px Aktionen.', (c) => {
    text(c, 'Kia EV6 GT-Line', { size: 16, weight: 700 });
    const row = auto(c, 'Data', 'HORIZONTAL', { gap: 8 }); badge(row, '82 Punkte', 'success'); badge(row, 'verifiziert', 'success');
    button(c, 'Details ansehen', { height: 44 });
  });
  documentedComponent(root, 'ScoreBreakdown', '70/30 Gewichtung bleibt für Nutzerinnen nachvollziehbar.', (c) => {
    const scores = auto(c, 'Scores', 'HORIZONTAL', { width: 496, gap: 12 });
    metric(scores, 'Finanzierung · 70%', '59 / 70', 'Rate und Gesamtkosten', 240);
    metric(scores, 'Ausstattung · 30%', '25 / 30', 'verifizierte Merkmale', 240);
  });
  documentedComponent(root, 'EvidenceDrawer', 'Beleg, Quelle und Verifikationsstatus direkt am Merkmal.', (c) => {
    badge(c, 'Verifiziert verfügbar', 'success');
    text(c, 'Wärmepumpe', { size: 17, weight: 700 });
    text(c, 'Im Ausstattungstext als „Wärmepumpe“ bestätigt.', { size: 12, color: C.secondary, width: 470 });
    button(c, 'Quelle öffnen', { kind: 'secondary' });
  });
  documentedComponent(root, 'EquipmentStateControl', 'Dreiwertige Eingabe statt erzwungener Ja/Nein-Annahme.', (c) => {
    stateStrip(c, [['PRESENT', 'success'], ['ABSENT', 'error'], ['UNKNOWN', 'neutral']], 496);
  });
  documentedComponent(root, 'FinanceScenarioCard', 'Eligibility, Rate und vorbereitete Modelle klar trennen.', (c) => {
    text(c, '48 Monate · 10.000 € Anzahlung', { size: 16, weight: 700 });
    text(c, '499 € / Monat', { size: 28, weight: 700 });
    stateStrip(c, [['ELIGIBLE', 'success'], ['INELIGIBLE', 'error'], ['PREPARED_ONLY', 'warning']], 496);
  });
  documentedComponent(root, 'FormField', 'Label bleibt sichtbar; Fokus und Fehler unterscheiden sich klar.', (c) => {
    inputField(c, 'Monatliches Budget', '550 €', 'focus', 496);
    stateStrip(c, [['DEFAULT', 'neutral'], ['FOCUS', 'info'], ['ERROR', 'error']], 496);
  });
  documentedComponent(root, 'InlineAlert', 'Kontextuelle Hinweise ohne modalen Unterbruch.', (c) => {
    callout(c, 'Ausstattung teilweise ungeprüft', 'Die Empfehlung bleibt vorläufig, bis lokale Verifikation abgeschlossen ist.', 'warning', 496);
  });
  documentedComponent(root, 'ConfirmDialog', 'Destruktive oder kostenrelevante Aktionen werden bestätigt.', (c) => {
    text(c, 'Lokales Modell entfernen?', { size: 18, weight: 700 });
    text(c, 'Neue Bewertungen sind danach offline nicht verfügbar.', { size: 12, color: C.secondary, width: 470 });
    const actions = auto(c, 'Actions', 'HORIZONTAL', { width: 496, gap: 8, primaryAlign: 'MAX' });
    button(actions, 'Abbrechen', { kind: 'secondary' }); button(actions, 'Entfernen', { kind: 'danger' });
  });
  documentedComponent(root, 'ModelDownload', 'Downloadstatus, Speicherbedarf und Offline-Verfügbarkeit.', (c) => {
    const row = auto(c, 'Model', 'HORIZONTAL', { width: 496, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
    const copy = auto(row, 'Copy', 'VERTICAL', { gap: 2 }); text(copy, 'ElektroBrudi Compact', { size: 14, weight: 700 }); text(copy, '4,2 GB · lokal', { size: 11, color: C.secondary });
    button(row, 'Laden', { kind: 'secondary' });
    stateStrip(c, [['READY', 'success'], ['DOWNLOADING', 'info'], ['OFFLINE', 'error']], 496);
  });

  const variantHeading = auto(root, 'Production variant sets · Header', 'VERTICAL', { width: 1248, gap: 5, paddingTop: 20 });
  text(variantHeading, 'Production variant sets', { size: 22, weight: 700 });
  text(variantHeading, 'Die zentralen Zustandsfamilien sind als echte Component Sets angelegt; Property: State.', { size: 13, color: C.secondary, width: 900 });
  componentVariants(root, 'StatusBadge', ['VERIFIED_AVAILABLE', 'DISCOVERED_UNVERIFIED', 'PARTIAL', 'FAILED'], (c, state) => {
    const tones = { VERIFIED_AVAILABLE: 'success', DISCOVERED_UNVERIFIED: 'warning', PARTIAL: 'warning', FAILED: 'error' };
    badge(c, state, tones[state]);
  }, 230);
  componentVariants(root, 'URLImport', ['EMPTY', 'VALID', 'INVALID'], (c, state) => {
    inputField(c, 'Angebots-URL', state === 'EMPTY' ? 'URL einfügen' : 'https://mobile.de/angebot/…', state === 'INVALID' ? 'error' : state === 'VALID' ? 'focus' : 'default', 250);
  }, 274);
  componentVariants(root, 'JobProgress', ['CRAWLING', 'WAITING_FOR_LOCAL_LLM', 'COMPLETED', 'FAILED'], (c, state) => {
    const tone = state === 'COMPLETED' ? 'success' : state === 'FAILED' ? 'error' : state === 'WAITING_FOR_LOCAL_LLM' ? 'warning' : 'info';
    badge(c, state, tone); text(c, state === 'CRAWLING' ? '12 Seiten · 3 Details' : state === 'COMPLETED' ? '4 Angebote ausgewertet' : 'Lokaler Verarbeitungsschritt', { size: 11, color: C.secondary, width: 210 });
  }, 234);
  componentVariants(root, 'EquipmentStateControl', ['PRESENT', 'ABSENT', 'UNKNOWN', 'PREPARED_ONLY'], (c, state) => {
    const tone = state === 'PRESENT' ? 'success' : state === 'ABSENT' ? 'error' : state === 'PREPARED_ONLY' ? 'warning' : 'neutral';
    badge(c, state, tone); text(c, state === 'PRESENT' ? '+ 6 Punkte' : '0 Punkte', { size: 12, weight: 700 });
  }, 220);
  componentVariants(root, 'FinanceScenarioCard', ['FINANCE_ELIGIBLE', 'FINANCE_INELIGIBLE', 'FINANCE_INVALID'], (c, state) => {
    const tone = state === 'FINANCE_ELIGIBLE' ? 'success' : 'error';
    badge(c, state, tone); text(c, '499 € / Monat', { size: 20, weight: 700 }); text(c, 'Gesamt 43.952 €', { size: 11, color: C.secondary });
  }, 280);
  componentVariants(root, 'FormField', ['DEFAULT', 'FOCUS', 'ERROR'], (c, state) => {
    inputField(c, 'Monatliches Budget', '550 €', state === 'FOCUS' ? 'focus' : state === 'ERROR' ? 'error' : 'default', 250);
  }, 274);
  componentVariants(root, 'InlineAlert', ['INFO', 'WARNING', 'ERROR'], (c, state) => {
    callout(c, state === 'INFO' ? 'Hinweis' : state === 'WARNING' ? 'Prüfung nötig' : 'Fehler', 'Kontext bleibt sichtbar und handlungsnah.', state.toLowerCase(), 270);
  }, 294);
  componentVariants(root, 'ModelDownload', ['READY', 'DOWNLOADING', 'FAILED'], (c, state) => {
    badge(c, state, state === 'READY' ? 'success' : state === 'DOWNLOADING' ? 'info' : 'error');
    text(c, state === 'DOWNLOADING' ? '62 % · 2,6 / 4,2 GB' : 'ElektroBrudi Compact', { size: 12, weight: 600, width: 230 });
  }, 254);
  bindSemanticTokens(root);
  return root;
}

function overviewSummary(parent, width) {
  const summary = auto(parent, 'Overview summary', 'HORIZONTAL', {
    width, height: 56, fill: C.surface, stroke: C.border, radius: 12,
    paddingLeft: 16, paddingRight: 16, gap: 0, counterAlign: 'CENTER',
  });
  const metrics = [
    ['Angebote', '7'], ['Verifiziert', '4'], ['Prüfung nötig', '2'], ['Aktualisiert', 'vor 2 Min.'],
  ];
  metrics.forEach(([label, value], index) => {
    const item = auto(summary, `Summary · ${label}`, 'HORIZONTAL', { width: index === 3 ? 275 : 165, gap: 8, counterAlign: 'CENTER' });
    if (index < 3) text(item, value, { size: 19, weight: 700, color: index === 2 ? C.warning : C.text });
    text(item, label, { size: 11, weight: 600, color: C.secondary });
    if (index === 3) text(item, value, { size: 12, weight: 600 });
    if (index < metrics.length - 1) frame(summary, 'Metric divider', { width: 1, height: 26, fill: C.border });
  });
  const spacer = frame(summary, 'Summary spacer', { width: 1, height: 1 }); spacer.layoutGrow = 1;
  badge(summary, 'Rang ↑', 'info');
  return summary;
}

function filterControl(parent, label, value, width, search = false) {
  const control = auto(parent, `Filter · ${label}`, 'HORIZONTAL', {
    width, height: 36, fill: C.surface, stroke: C.border, radius: 9,
    paddingLeft: 10, paddingRight: 10, gap: 7, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER',
  });
  const copy = auto(control, 'Filter copy', 'HORIZONTAL', { gap: 6, counterAlign: 'CENTER' });
  if (search) text(copy, '⌕', { size: 14, weight: 600, color: C.secondary });
  text(copy, value, { size: 11, color: search ? C.secondary : C.text, weight: search ? 400 : 500 });
  if (!search) text(control, '⌄', { size: 11, color: C.secondary });
  return control;
}

function overviewFilters(parent, width) {
  const filters = auto(parent, 'Overview filters', 'HORIZONTAL', { width, gap: 8, counterAlign: 'CENTER' });
  filterControl(filters, 'Suche', 'Fahrzeug suchen', 220, true);
  filterControl(filters, 'Verifikation', 'Verifikation: Alle', 145);
  filterControl(filters, 'Quelle', 'Quelle: Alle', 118);
  filterControl(filters, 'Finanzierung', 'Finanzierung: Zulässig', 165);
  filterControl(filters, 'Ausstattung', 'Ausstattung: Alle', 142);
  const spacer = frame(filters, 'Filter spacer', { width: 1, height: 1 }); spacer.layoutGrow = 1;
  button(filters, 'Zurücksetzen', { kind: 'secondary', height: 36 });
  return filters;
}

const TABLE_COLUMN_WIDTHS = [40, 142, 82, 66, 64, 70, 68, 64, 58, 40, 68, 34];

function tableCell(parent, value, width, options = {}) {
  const cell = auto(parent, options.name || `Cell · ${value}`, options.stack ? 'VERTICAL' : 'HORIZONTAL', {
    width, height: options.height || 54, gap: options.stack ? 1 : 4,
    primaryAlign: options.stack ? 'CENTER' : (options.align === 'RIGHT' ? 'MAX' : 'MIN'),
    counterAlign: options.stack ? 'MIN' : 'CENTER',
  });
  if (options.badgeTone) {
    const toneColors = { success: C.success, warning: C.warning, error: C.error, neutral: C.secondary };
    dot(cell, toneColors[options.badgeTone] || C.secondary, 6);
    text(cell, value, { size: 9, weight: 600, color: toneColors[options.badgeTone] || C.secondary, width: width - 13 });
  } else text(cell, value, { size: options.size || 10, weight: options.weight || 500, color: options.color || C.text, width: width - 4, align: options.align });
  if (options.secondary) text(cell, options.secondary, { size: 9, color: C.secondary, width: width - 4, lineHeight: 12 });
  return cell;
}

function sortHeader(parent, label, width, sortable) {
  const cell = auto(parent, `Column · ${label || 'Action'}`, 'HORIZONTAL', { width, height: 38, gap: 3, counterAlign: 'CENTER' });
  if (label) text(cell, label, { size: 9, weight: 600, color: C.secondary, width: sortable ? width - 14 : width - 2 });
  if (sortable) text(cell, label === 'Rang' ? '↑' : '↕', { name: 'Sort indicator', size: 9, weight: 600, color: label === 'Rang' ? C.accent : C.secondary });
}

function desktopTable(parent, width) {
  const table = card(parent, 'Offer comparison table', { width, padding: 0, gap: 0 });
  const title = auto(table, 'Table title', 'HORIZONTAL', { width, height: 44, paddingLeft: 12, paddingRight: 12, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  text(title, 'Alle Angebote', { size: 15, weight: 700 });
  const meta = auto(title, 'Table meta', 'HORIZONTAL', { gap: 7, counterAlign: 'CENTER' });
  badge(meta, '7 Ergebnisse', 'neutral'); badge(meta, 'Sortiert: Rang ↑', 'info');
  divider(table, width);
  const header = auto(table, 'Table header', 'HORIZONTAL', { width, height: 38, fill: C.subtle, paddingLeft: 8, paddingRight: 8, gap: 0, counterAlign: 'CENTER' });
  contract.overviewTableColumns.forEach((label, index) => sortHeader(header, label, TABLE_COLUMN_WIDTHS[index], [0, 3, 4, 5, 6, 9, 10].includes(index)));
  divider(table, width);
  contract.overviewOffers.forEach((offer, index) => {
    const row = auto(table, `OfferRow · order ${offer.order}`, 'HORIZONTAL', {
      width, height: 58, fill: offer.order === 1 ? C.infoBg : C.surface,
      paddingLeft: 8, paddingRight: 8, gap: 0, counterAlign: 'CENTER',
    });
    tableCell(row, String(offer.order), TABLE_COLUMN_WIDTHS[0], { size: 12, weight: 700, color: offer.order === 1 ? C.accent : C.secondary });
    tableCell(row, offer.vehicle, TABLE_COLUMN_WIDTHS[1], { stack: true, secondary: offer.source, size: 10, weight: 600 });
    tableCell(row, offer.verification, TABLE_COLUMN_WIDTHS[2], { badgeTone: offer.verificationTone });
    tableCell(row, offer.price, TABLE_COLUMN_WIDTHS[3], { align: 'RIGHT' });
    tableCell(row, offer.mileage, TABLE_COLUMN_WIDTHS[4], { align: 'RIGHT', size: 9 });
    tableCell(row, offer.monthly, TABLE_COLUMN_WIDTHS[5], { align: 'RIGHT', weight: 700 });
    tableCell(row, offer.golfDelta, TABLE_COLUMN_WIDTHS[6], { align: 'RIGHT', color: C.success, weight: 700 });
    tableCell(row, offer.finance, TABLE_COLUMN_WIDTHS[7], { badgeTone: offer.financeTone });
    tableCell(row, offer.equipment, TABLE_COLUMN_WIDTHS[8], { align: 'RIGHT' });
    tableCell(row, offer.score, TABLE_COLUMN_WIDTHS[9], { align: 'RIGHT', size: 14, weight: 700 });
    tableCell(row, offer.updated, TABLE_COLUMN_WIDTHS[10], { size: 9, color: C.secondary });
    const action = auto(row, 'Row action', 'HORIZONTAL', { width: TABLE_COLUMN_WIDTHS[11], height: 54, primaryAlign: 'CENTER', counterAlign: 'CENTER' });
    text(action, '›', { size: 17, weight: 600, color: C.accent });
    if (index < contract.overviewOffers.length - 1) divider(table, width);
  });
  return table;
}

function selectedOfferInspector(parent, width, offer) {
  const inspector = card(parent, 'SelectedOfferInspector', { width, padding: 16, gap: 12, shadow: true });
  const heading = auto(inspector, 'Inspector heading', 'HORIZONTAL', { width: width - 32, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  text(heading, 'Ausgewähltes Angebot', { size: 11, weight: 600, color: C.secondary });
  badge(heading, `Rang ${offer.order}`, 'success');
  text(inspector, offer.vehicle, { size: 18, weight: 700, width: width - 32, lineHeight: 23 });
  const statuses = auto(inspector, 'Inspector statuses', 'HORIZONTAL', { width: width - 32, gap: 6 });
  badge(statuses, offer.verification, offer.verificationTone); badge(statuses, offer.finance, offer.financeTone);
  divider(inspector, width - 32);
  [['Kaufpreis', offer.price], ['Effektiv / Monat', offer.monthly], ['Gegen Golf', `${offer.golfDelta} / Monat`]].forEach(([label, value]) => {
    const row = auto(inspector, `Inspector · ${label}`, 'HORIZONTAL', { width: width - 32, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
    text(row, label, { size: 11, color: C.secondary });
    text(row, value, { size: 13, weight: 700, color: label === 'Gegen Golf' ? C.success : C.text });
  });
  divider(inspector, width - 32);
  text(inspector, 'Bewertung', { size: 13, weight: 700 });
  const scoreRow = auto(inspector, 'Score split', 'HORIZONTAL', { width: width - 32, gap: 8 });
  metric(scoreRow, 'Finanzierung · 70%', '59 / 70', 'Rate & Gesamtkosten', 139);
  metric(scoreRow, 'Ausstattung · 30%', '25 / 30', 'verifizierte Merkmale', 139);
  text(inspector, 'Ausstattung', { size: 13, weight: 700 });
  [['Wärmepumpe', 'vorhanden'], ['Matrix-LED', 'vorhanden'], ['Anhängerkupplung', 'ungeprüft']].forEach(([label, value], index) => {
    const row = auto(inspector, `Equipment · ${label}`, 'HORIZONTAL', { width: width - 32, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
    text(row, label, { size: 11 }); badge(row, value, index === 2 ? 'warning' : 'success');
  });
  callout(inspector, 'Zuletzt aktualisiert', `${offer.updated} · ${offer.source}`, 'info', width - 32);
  const details = button(inspector, 'Details öffnen', { height: 40 }); details.resize(width - 32, 40);
  return inspector;
}

function buildOverviewDesktop(page, x, y) {
  const screen = auto(page, contract.overviewFrames[0].name, 'HORIZONTAL', {
    x, y, width: 1440, height: 1024, fill: C.app, radius: 16, clipsContent: true, shadow: true,
  });
  buildSidebar(screen, 'Übersicht', 1024, false);
  const workspace = auto(screen, 'Workspace', 'VERTICAL', { width: 1208, height: 1024, fill: C.app, gap: 0 });
  topNav(workspace, 'Angebotsübersicht', '7 Angebote · Auswertung abgeschlossen', 1208);
  const content = auto(workspace, 'Content', 'VERTICAL', { width: 1208, height: 960, padding: 24, gap: 12 });
  const heading = auto(content, 'Heading', 'HORIZONTAL', { width: 1160, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  const copy = auto(heading, 'Copy', 'VERTICAL', { gap: 4 });
  text(copy, 'Alle Angebote', { size: 27, weight: 700 });
  text(copy, 'Vergleichen, sortieren und auswählen — Rang bleibt unabhängig von der Sortierung.', { size: 12, color: C.secondary });
  const actions = auto(heading, 'Header actions', 'HORIZONTAL', { gap: 8, counterAlign: 'CENTER' });
  button(actions, 'Alle aktualisieren', { kind: 'secondary', icon: '↻' });
  button(actions, 'Angebot hinzufügen', { icon: '＋' });
  overviewSummary(content, 1160);
  overviewFilters(content, 1160);
  const columns = auto(content, 'Comparison workspace', 'HORIZONTAL', { width: 1160, gap: 14, counterAlign: 'MIN' });
  desktopTable(columns, 820);
  selectedOfferInspector(columns, 326, contract.overviewOffers[0]);
  bindSemanticTokens(screen);
  return screen;
}

function mobileOffer(parent, offer, selected = false) {
  const node = card(parent, `OfferCard · order ${offer.order}`, {
    width: 350, padding: 12, gap: 8,
    fill: selected ? C.infoBg : C.surface,
    stroke: selected ? C.accent : C.border,
    shadow: selected,
  });
  const top = auto(node, 'Rank and verification', 'HORIZONTAL', {
    width: 326, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER',
  });
  const rankLabel = offer.order === 1 ? 'Rang 1' : `Rang ${offer.order}`;
  badge(top, rankLabel, selected ? 'info' : 'neutral');
  badge(top, offer.verification, offer.verificationTone);

  const identity = auto(node, 'Offer identity', 'HORIZONTAL', {
    width: 326, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'MIN',
  });
  const copy = auto(identity, 'Vehicle and source', 'VERTICAL', { width: 258, gap: 2 });
  text(copy, offer.vehicle, { size: 14, weight: 700, width: 258, lineHeight: 18 });
  text(copy, offer.source, { size: 10, color: C.secondary, width: 258, lineHeight: 14 });
  text(identity, offer.score, { size: 24, weight: 700, color: selected ? C.accent : C.text });

  const facts = auto(node, 'Offer facts', 'HORIZONTAL', { width: 326, gap: 8, counterAlign: 'CENTER' });
  text(facts, `${offer.price} · ${offer.mileage}`, { size: 10, weight: 500, width: 157 });
  text(facts, `${offer.monthly} / Monat`, { size: 11, weight: 700, width: 161, align: 'RIGHT' });
  const evaluation = auto(node, 'Offer evaluation', 'HORIZONTAL', {
    width: 326, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER',
  });
  text(evaluation, `Golf ${offer.golfDelta} · Ausstattung ${offer.equipment}`, { size: 10, color: C.success, weight: 600, width: 235 });
  text(evaluation, offer.finance, { size: 10, weight: 600, color: offer.financeTone === 'error' ? C.error : offer.financeTone === 'warning' ? C.warning : C.success });
  if (selected) {
    const action = button(node, 'Auswahl ansehen', { kind: 'secondary', height: 36 });
    action.resize(326, 36);
  }
  return node;
}

function buildOverviewMobile(page, x, y) {
  const screen = auto(page, contract.overviewFrames[1].name, 'VERTICAL', {
    x, y, width: 390, height: 844, fill: C.app, radius: 28, clipsContent: true, shadow: true,
  });
  topNav(screen, 'Kaufentscheidung', '', 390, true);
  const content = auto(screen, 'Content', 'VERTICAL', { width: 390, height: 784, padding: 20, gap: 10 });
  const heading = auto(content, 'Heading', 'HORIZONTAL', { width: 350, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  const copy = auto(heading, 'Copy', 'VERTICAL', { gap: 2 }); text(copy, 'Alle Angebote', { size: 22, weight: 700 }); text(copy, '7 Ergebnisse · Rang bleibt stabil', { size: 11, color: C.secondary });
  iconBox(heading, '＋', { box: 44, fill: C.accent, color: C.surface, radius: 12 });
  const importer = auto(content, 'Compact import', 'HORIZONTAL', {
    width: 350, height: 44, fill: C.surface, stroke: C.border, radius: 10,
    paddingLeft: 12, paddingRight: 6, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER',
  });
  text(importer, 'Angebots-URL einfügen', { size: 12, color: C.secondary });
  button(importer, 'Importieren', { height: 32 });

  const controls = auto(content, 'Mobile search and sort', 'HORIZONTAL', { width: 350, gap: 8, counterAlign: 'CENTER' });
  filterControl(controls, 'Suche', 'Suchen', 128, true);
  filterControl(controls, 'Sortierung', 'Rang ↑', 112);
  button(controls, 'Filter', { kind: 'secondary', height: 36 });

  text(content, 'Sortierte Treffer', { size: 13, weight: 700 });
  mobileOffer(content, contract.overviewOffers[0], true);
  mobileOffer(content, contract.overviewOffers[1]);
  mobileOffer(content, contract.overviewOffers[2]);
  text(content, '4 weitere Angebote beim Scrollen', { size: 11, color: C.secondary, width: 350, align: 'CENTER' });
  bindSemanticTokens(screen);
  return screen;
}

function referenceShell(page, name, x, y, width, height, mobile, title, selected) {
  const shell = auto(page, name, mobile ? 'VERTICAL' : 'HORIZONTAL', { x, y, width, height, fill: C.app, radius: mobile ? 24 : 14, clipsContent: true, shadow: true });
  let workspace = shell;
  if (!mobile) {
    buildSidebar(shell, selected, height, false);
    workspace = auto(shell, 'Workspace', 'VERTICAL', { width: width - 232, height, fill: C.app });
  }
  topNav(workspace, title, mobile ? '' : 'Referenzmuster für spätere HTML-Mockups', mobile ? width : width - 232, mobile);
  return { shell, workspace };
}

function buildOfferDetailReference(page, name, x, y, mobile) {
  const width = mobile ? 390 : 1100;
  const height = mobile ? 844 : 760;
  const { shell, workspace } = referenceShell(page, name, x, y, width, height, mobile, 'Angebotsdetails', 'Übersicht');
  const contentWidth = mobile ? 350 : width - 288;
  const content = auto(workspace, 'Content', 'VERTICAL', { width: mobile ? 390 : width - 232, height: height - 64, padding: mobile ? 20 : 28, gap: 14 });
  const heading = auto(content, 'Heading', 'VERTICAL', { width: contentWidth, gap: 5 });
  const badges = auto(heading, 'Badges', 'HORIZONTAL', { gap: 7 }); badge(badges, 'Verifiziert verfügbar', 'success'); badge(badges, '84 Punkte', 'success');
  text(heading, 'Hyundai IONIQ 5 · Techniq', { size: mobile ? 22 : 28, weight: 700 });
  text(heading, '36.490 € · 22.900 km · Erstzulassung 04/2023', { size: 12, color: C.secondary, width: contentWidth });
  const layout = auto(content, 'Detail layout', mobile ? 'VERTICAL' : 'HORIZONTAL', { width: contentWidth, gap: 14, counterAlign: 'MIN' });
  const leftWidth = mobile ? contentWidth : 500;
  const evidence = card(layout, 'EvidenceDrawer', { width: leftWidth, padding: 16, gap: 10 });
  text(evidence, 'Ausstattung & Belege', { size: 17, weight: 700 });
  [['Wärmepumpe', 'Im Inserat bestätigt', 'success'], ['Matrix-LED', 'Herstellerliste', 'success'], ['Anhängerkupplung', 'nur entdeckt', 'warning']].forEach(([label, detail, tone]) => {
    const row = auto(evidence, label, 'HORIZONTAL', { width: leftWidth - 32, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
    const copy = auto(row, 'Copy', 'VERTICAL', { gap: 1 }); text(copy, label, { size: 12, weight: 600 }); text(copy, detail, { size: 10, color: C.secondary });
    badge(row, tone === 'success' ? 'verifiziert' : 'ungeprüft', tone);
  });
  const finance = card(layout, 'FinanceScenarioCard', { width: mobile ? contentWidth : 298, padding: 16, gap: 8 });
  text(finance, 'Finanzierung', { size: 17, weight: 700 }); badge(finance, 'FINANCE_ELIGIBLE', 'success');
  text(finance, '499 € / Monat', { size: 27, weight: 700 }); text(finance, '48 Monate · 10.000 € Anzahlung', { size: 11, color: C.secondary, width: mobile ? 318 : 266 });
  const score = card(content, 'ScoreBreakdown & ReferenceDelta', { width: contentWidth, padding: 16, gap: 8 });
  const scoreRow = auto(score, 'Scores', 'HORIZONTAL', { width: contentWidth - 32, gap: 8, counterAlign: 'CENTER' });
  badge(scoreRow, 'Finanzierung 59 / 70', 'info'); badge(scoreRow, 'Ausstattung 25 / 30', 'success');
  const delta = auto(score, 'ReferenceDelta', 'HORIZONTAL', { width: contentWidth - 32, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  text(delta, 'Gegen Golf-Referenz', { size: 12, weight: 600 }); badge(delta, '− 71 € / Monat', 'success');
  const correction = auto(score, 'Correction controls', 'HORIZONTAL', { width: contentWidth - 32, gap: 8, counterAlign: 'CENTER' });
  text(correction, 'Nutzerkorrektur', { size: 11, color: C.secondary }); button(correction, 'Bestätigen', { kind: 'secondary' }); button(correction, 'Als unbekannt', { kind: 'secondary' });
  if (!mobile) callout(content, 'Nachvollziehbar bewertet', 'Jedes bewertete Merkmal verweist auf Status und Beleg.', 'info', contentWidth);
  bindSemanticTokens(shell);
  return shell;
}

function buildSettingsReference(page, name, x, y, mobile) {
  const width = mobile ? 390 : 1100;
  const height = mobile ? 844 : 760;
  const { shell, workspace } = referenceShell(page, name, x, y, width, height, mobile, 'Einstellungen', 'Einstellungen');
  const contentWidth = mobile ? 350 : width - 288;
  const content = auto(workspace, 'Content', 'VERTICAL', { width: mobile ? 390 : width - 232, height: height - 64, padding: mobile ? 20 : 28, gap: 14 });
  text(content, 'Lokale Analyse', { size: mobile ? 22 : 28, weight: 700 });
  text(content, 'Modell, Datenschutz und Verbindung auf diesem Mac verwalten.', { size: 12, color: C.secondary, width: contentWidth });
  const model = card(content, 'ModelDownload', { width: contentWidth, padding: 16, gap: 10 });
  const row = auto(model, 'Model row', 'HORIZONTAL', { width: contentWidth - 32, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  const copy = auto(row, 'Copy', 'VERTICAL', { gap: 2 }); text(copy, 'ElektroBrudi Compact', { size: 15, weight: 700 }); text(copy, '4,2 GB · zuletzt aktualisiert heute', { size: 11, color: C.secondary });
  badge(row, 'Bereit', 'success');
  if (mobile) button(model, 'Modell verwalten', { kind: 'secondary', height: 44 }); else {
    const actionRow = auto(model, 'Actions', 'HORIZONTAL', { gap: 8 }); button(actionRow, 'Aktualisieren', { kind: 'secondary' }); button(actionRow, 'Entfernen', { kind: 'danger' });
  }
  const credentials = card(content, 'Credentials', { width: contentWidth, padding: 16, gap: 10 });
  text(credentials, 'Zugang & Keychain', { size: 16, weight: 700 });
  const status = auto(credentials, 'Status', 'HORIZONTAL', { width: contentWidth - 32, primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' }); text(status, 'API-Schlüssel', { size: 12, weight: 600 }); badge(status, 'KEYCHAIN_MISSING', 'error');
  inputField(credentials, 'Schlüssel', '••••••••••••••••', 'default', contentWidth - 32);
  const baseline = card(content, 'Reference baseline', { width: contentWidth, padding: 16, gap: 10 });
  text(baseline, 'Golf-Referenz & Gewichtung', { size: 16, weight: 700 });
  const fields = auto(baseline, 'Fields', mobile ? 'VERTICAL' : 'HORIZONTAL', { width: contentWidth - 32, gap: 10 });
  inputField(fields, 'Golf monatlich', '428 €', 'default', mobile ? contentWidth - 32 : 230);
  inputField(fields, 'Finanzierung', '70 %', 'focus', mobile ? contentWidth - 32 : 230);
  inputField(fields, 'Ausstattung', '30 %', 'focus', mobile ? contentWidth - 32 : 230);
  const save = auto(baseline, 'Save actions', 'HORIZONTAL', { width: contentWidth - 32, gap: 8, primaryAlign: 'MAX', counterAlign: 'CENTER' });
  text(save, 'Änderungen lösen Neuberechnung aus.', { size: 10, color: C.secondary }); button(save, 'Speichern & neu berechnen');
  callout(content, 'Offline-Modus', 'Vorhandene Bewertungen bleiben lesbar; neue Verifikation wartet auf Verbindung.', 'warning', contentWidth);
  bindSemanticTokens(shell);
  return shell;
}

function buildPrototypeStates(page, x, y) {
  const section = auto(page, 'Overview Import · Prototype states', 'VERTICAL', { x, y, width: 2100, fill: C.app, padding: 32, gap: 18 });
  sectionHeader(section, 'Prototype', 'Import Flow', 'EMPTY → VALID → CRAWLING → WAITING_FOR_LOCAL_LLM → COMPLETED; PARTIAL und FAILED dokumentieren die Abzweige.', 1200);
  const row = auto(section, 'States', 'HORIZONTAL', { width: 2036, gap: 16, counterAlign: 'MIN' });
  const specs = [
    ['EMPTY', 'Angebot importieren', 'URL einfügen', 'Weiter', 'neutral'],
    ['VALID', 'URL erkannt', 'mobile.de Angebot bereit', 'Import starten', 'success'],
    ['CRAWLING', 'Angebot wird gelesen', 'Daten und Bilder werden lokal erfasst', 'Weiter', 'info'],
    ['WAITING_FOR_LOCAL_LLM', 'Lokale Bewertung', 'Ausstattung wird verifiziert', 'Weiter', 'warning'],
    ['COMPLETED', 'Auswertung fertig', 'Zur Kaufentscheidung wechseln', 'Übersicht öffnen', 'success'],
    ['PARTIAL', 'Teilweise ausgewertet', 'Ein Angebot konnte nicht verifiziert werden', 'Trotzdem öffnen', 'warning'],
    ['FAILED', 'Import fehlgeschlagen', 'Letzte Daten bleiben erhalten', 'Erneut versuchen', 'error'],
  ];
  const frames = [];
  const triggers = [];
  specs.forEach(([state, title, detail, action, tone]) => {
    const stateFrame = auto(row, `Import · ${state}`, 'VERTICAL', { width: 262, height: 300, fill: C.surface, stroke: C.border, radius: 14, padding: 18, gap: 12 });
    badge(stateFrame, state, tone);
    iconBox(stateFrame, state === 'COMPLETED' ? '✓' : state === 'EMPTY' ? '＋' : '↻', { box: 42, fill: tone === 'success' ? C.successBg : tone === 'warning' ? C.warningBg : C.infoBg, color: tone === 'success' ? C.success : tone === 'warning' ? C.warning : C.info, radius: 12 });
    text(stateFrame, title, { size: 17, weight: 700, width: 226 });
    text(stateFrame, detail, { size: 12, color: C.secondary, width: 226, lineHeight: 17 });
    const spacer = frame(stateFrame, 'Spacer', { width: 1, height: 20 }); spacer.layoutGrow = 1;
    const actionNode = button(stateFrame, action, { height: 44 });
    actionNode.resize(226, 44);
    frames.push(stateFrame);
    triggers.push(actionNode);
  });
  return { section, frames, triggers };
}

async function wirePrototype(prototype) {
  if (!prototype || !prototype.triggers) return;
  for (let index = 0; index < prototype.triggers.length; index += 1) {
    const destination = prototype.frames[(index + 1) % prototype.frames.length];
    const trigger = prototype.triggers[index];
    if (typeof trigger.setReactionsAsync !== 'function') continue;
    try {
      await trigger.setReactionsAsync([{
        trigger: { type: 'ON_CLICK' },
        actions: [{
          type: 'NODE',
          destinationId: destination.id,
          navigation: 'NAVIGATE',
          transition: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.18 },
          preserveScrollPosition: false,
        }],
      }]);
    } catch (_) { /* Reactions are best-effort across API versions. */ }
  }
}

async function buildKeyScreens(page) {
  const root = frame(page, GENERATED_ROOTS[2], { x: 0, y: 0, width: 3100, height: 3900, fill: C.app });
  const title = text(root, 'Key Screens', { name: 'Page title', size: 36, weight: 700 });
  title.x = 48;
  title.y = 40;
  const subtitle = text(root, 'Polished Overview plus representative patterns for the remaining HTML mockups.', { size: 14, color: C.secondary });
  subtitle.x = 48;
  subtitle.y = 90;
  const desktop = buildOverviewDesktop(root, 48, 140);
  const mobile = buildOverviewMobile(root, 1536, 140);
  const detailDesktop = buildOfferDetailReference(root, contract.referenceSections[0], 48, 1240, false);
  const detailMobile = buildOfferDetailReference(root, contract.referenceSections[1], 1196, 1240, true);
  const settingsDesktop = buildSettingsReference(root, contract.referenceSections[2], 48, 2080, false);
  const settingsMobile = buildSettingsReference(root, contract.referenceSections[3], 1196, 2080, true);
  const prototype = buildPrototypeStates(root, 48, 3000);
  await wirePrototype(prototype);
  [desktop, mobile, detailDesktop, detailMobile, settingsDesktop, settingsMobile].forEach(bindSemanticTokens);
  return root;
}

const context = {
  variables: new Map(),
  fontFamily: 'SF Pro Text',
  fonts: { Regular: 'Regular', Medium: 'Medium', Semibold: 'Semibold', Bold: 'Bold' },
  fallbackFamily: 'Inter',
  fallbackFonts: { Regular: 'Regular', Medium: 'Medium', Semibold: 'Semi Bold', Bold: 'Bold' },
};

/** @returns {{Regular: string, Medium: string, Semibold: string, Bold: string}} */
function resolveFontStyles(available, family) {
  const familyStyles = available
    .filter((item) => item.fontName.family === family)
    .map((item) => item.fontName.style);
  const normalize = (value) => value.toLowerCase().replace(/ /g, '');
  const resolved = { Regular: '', Medium: '', Semibold: '', Bold: '' };
  for (const requested of ['Regular', 'Medium', 'Semibold', 'Bold']) {
    resolved[requested] = familyStyles.find((style) => normalize(style) === normalize(requested))
      || familyStyles.find((style) => normalize(style).includes(normalize(requested)))
      || familyStyles[0];
  }
  return resolved;
}

async function loadContext() {
  const available = await figma.listAvailableFontsAsync();
  const preferredFamilies = ['SF Pro Text', 'SF Pro Display', 'SF Pro'];
  const family = preferredFamilies.find((candidate) => available.some((item) => item.fontName.family === candidate));
  if (!family) throw new Error('SF Pro is required but is not available in this Figma desktop environment.');
  context.fontFamily = family;
  context.fonts = resolveFontStyles(available, family);
  context.fallbackFamily = available.some((item) => item.fontName.family === 'Inter') ? 'Inter' : family;
  context.fallbackFonts = resolveFontStyles(available, context.fallbackFamily);
  const fontsToLoad = new Map();
  for (const fontFamily of [context.fontFamily, context.fallbackFamily]) {
    const styles = fontFamily === context.fontFamily ? context.fonts : context.fallbackFonts;
    Object.values(styles).forEach((style) => fontsToLoad.set(`${fontFamily}\u0000${style}`, { family: fontFamily, style }));
  }
  await Promise.all(Array.from(fontsToLoad.values()).map((font) => figma.loadFontAsync(font)));
  const variables = await figma.variables.getLocalVariablesAsync();
  variables.forEach((variable) => context.variables.set(variable.name, variable));
}

async function findPages() {
  await figma.loadAllPagesAsync();
  const pages = new Map(figma.root.children.map((page) => [page.name, page]));
  const missing = contract.pages.filter((name) => !pages.has(name));
  if (missing.length) throw new Error(`Missing required page(s): ${missing.join(', ')}`);
  if (figma.root.children.length !== 3) throw new Error(`Expected exactly 3 pages, found ${figma.root.children.length}.`);
  return contract.pages.map((name) => /** @type {PageNode} */ (pages.get(name)));
}

function cleanupIncompleteGeneratedRoots(pages) {
  const incomplete = [];
  pages.forEach((page) => {
    page.children.forEach((node) => {
      if (GENERATED_ROOTS.includes(node.name) && node.getPluginData(BUILD_STATUS_KEY) !== BUILD_COMPLETE) {
        incomplete.push(node);
      }
    });
  });
  incomplete.forEach((node) => node.remove());
  return incomplete.length;
}

function prepareGeneratedTargets(pages) {
  const complete = [];
  pages.forEach((page) => {
    page.children.forEach((node) => {
      if (GENERATED_ROOTS.includes(node.name) && node.getPluginData(BUILD_STATUS_KEY) === BUILD_COMPLETE) {
        complete.push(node);
      }
    });
  });
  cleanupIncompleteGeneratedRoots(pages);
  return complete;
}

function focusOverview(screens, notification) {
  const focusFrame = screens.findOne((node) => node.name === contract.overviewFrames[0].name)
    || screens.findOne((node) => (
      'width' in node
      && 'height' in node
      && node.width === contract.overviewFrames[0].width
      && node.height === contract.overviewFrames[0].height
    ));
  if (!focusFrame || !('x' in focusFrame)) {
    throw new Error('Primary Overview frame was not found.');
  }
  figma.currentPage.selection = [focusFrame];
  figma.viewport.scrollAndZoomIntoView([focusFrame]);
  figma.notify(notification, { timeout: 5000 });
}

async function build() {
  const pages = await findPages();
  const completeRoots = prepareGeneratedTargets(pages);
  if (completeRoots.length) {
    await figma.setCurrentPageAsync(pages[2]);
    const existingScreens = completeRoots.find((node) => node.name === GENERATED_ROOTS[2]);
    if (!existingScreens) {
      throw new Error('Completed Key Screens root was not found.');
    }
    focusOverview(pages[2], 'Existing Overview focused.');
    figma.closePlugin('Existing Overview focused.');
    return;
  }
  await loadContext();
  let foundations;
  let components;
  let screens;
  try {
    await figma.setCurrentPageAsync(pages[0]);
    foundations = buildFoundations(pages[0]);
    await figma.setCurrentPageAsync(pages[1]);
    components = buildComponents(pages[1]);
    await figma.setCurrentPageAsync(pages[2]);
    screens = await buildKeyScreens(pages[2]);
    [foundations, components, screens].forEach((root) => root.setPluginData(BUILD_STATUS_KEY, BUILD_COMPLETE));
  } catch (error) {
    cleanupIncompleteGeneratedRoots(pages);
    throw error;
  }
  focusOverview(screens, 'ElektroBrudi: 3 pages, component language, key screens and prototype created.');
  figma.closePlugin('ElektroBrudi design built successfully.');
  return { foundations, components, screens };
}

if (typeof figma !== 'undefined') {
  build().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    figma.notify(`ElektroBrudi builder stopped: ${message}`, { error: true, timeout: 8000 });
    figma.closePlugin(`Stopped safely: ${message}`);
  });
}
