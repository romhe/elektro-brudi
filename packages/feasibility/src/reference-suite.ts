import { createHash } from "node:crypto";
import {
  EXTRACTION_SCHEMA_VERSION,
  extractionEnvelopeSchema,
  type EquipmentClaim,
  type EquipmentState,
  type ExtractionEnvelope,
} from "@elektro-brudi/contracts";

export const referenceSources = [
  {
    id: "volkswagen",
    url: "https://www.volkswagen.de/de/modelle/verfuegbare-fahrzeuge-suche.html/__app/search/car/REVVMzIxOTExNDgxOA=.app?pageIndex-app=1&t_manuf-app=BQ&t_manuf-app=BI&t_model-app=BQIE&t_model-app=BQIF&t_model-app=BQJA&t_model-app=BQJC&t_model-app=BIBL&t_pe_to-app=30000&t_battery_capacity_fr-app=70&t_eq_park-app=Zp2&t_km_to-app=100000&t_pe_fr-app=12500&sort-app=PRICE_SALE&sortdirection-app=ASC",
  },
  {
    id: "feser-graf",
    url: "https://www.feser-graf.de/fahrzeuge/vw/id.4/suv-gelaendewagen-pickup-elektro-125kw-183370904/?categories_type=car&data_fuel=electric&sort=lowestprice",
  },
  {
    id: "huelpert",
    url: "https://www.huelpert.de/fahrzeug/vw-id-4-pure-performance-carplay-tempomat-einparkh_251733857151",
  },
  {
    id: "mobile-de",
    url: "https://suchen.mobile.de/fahrzeuge/details.html?id=42894773078528&scopeId=C&action=parkItem&vc=Car&s=Car",
  },
  {
    id: "tesla",
    url: "https://www.tesla.com/de_DE/m3/order/LRW3E7FJ1MC333106?postal=31582&coord=52.6493,9.2365&region=NI&titleStatus=used&redirect=no#overview",
  },
] as const;

export type ReferenceSource = (typeof referenceSources)[number];

export const equipmentIds = [
  "adaptive_cruise_control",
  "active_lane_centering",
  "blind_spot_lane_change_assist",
  "reversing_camera",
  "surround_view_camera",
  "matrix_pixel_led",
  "heat_pump",
  "battery_preconditioning",
  "carplay_android_auto",
  "tow_bar",
] as const;

export type EquipmentId = (typeof equipmentIds)[number];

const equipmentAliases: Record<EquipmentId, readonly RegExp[]> = {
  adaptive_cruise_control: [
    /\bACC\b/iu,
    /adaptive\s+cruise\s+control/iu,
    /abstandsregel(?:tempomat|anlage)/iu,
    /automatische\s+distanzregelung/iu,
  ],
  active_lane_centering: [
    /\btravel\s+assist\b/iu,
    /active\s+lane\s+centering/iu,
    /aktive\w*\s+spurzentrierung/iu,
    /spurzentrier\w*/iu,
  ],
  blind_spot_lane_change_assist: [
    /\bside\s+assist\b/iu,
    /totwinkelassistent/iu,
    /spurwechselassistent/iu,
    /blind[ -]?spot/iu,
  ],
  reversing_camera: [/rückfahrkamera/iu, /rear[ -]?view\s+camera/iu],
  surround_view_camera: [
    /\barea\s+view\b/iu,
    /360[ -]?(?:grad|°)[ -]?kamera/iu,
    /surround[ -]?view/iu,
  ],
  matrix_pixel_led: [
    /matrix[ -]?(?:pixel[ -]?)?led/iu,
    /\biq\.?light\b/iu,
    /pixel[ -]?led/iu,
  ],
  heat_pump: [/wärmepumpe/iu, /heat\s+pump/iu],
  battery_preconditioning: [
    /batterie[ -]?vorkonditionierung/iu,
    /vorkonditionierung\s+(?:der\s+)?batterie/iu,
    /battery\s+preconditioning/iu,
  ],
  carplay_android_auto: [
    /apple\s+carplay/iu,
    /android\s+auto/iu,
    /smartphone[ -]?integration/iu,
  ],
  tow_bar: [
    /anhängerkupplung/iu,
    /anhängevorrichtung/iu,
    /\bAHK\b/iu,
    /tow[ -]?bar/iu,
  ],
};

const subscriptionQualifier =
  /(?:abonnement|subscription|freischaltbar|nachträglich\s+aktivierbar|on[ -]?demand)/iu;
const preparationQualifier =
  /(?:vorbereitet|vorbereitung|optional|optionale|gegen\s+aufpreis|preparation)/iu;
const absenceQualifier =
  /(?:\bohne\b|nicht\s+vorhanden|nicht\s+verbaut|entfällt|\bno\b)/iu;
const monthlyPriceQualifier =
  /(?:monat|monatl|rate|leasing|finanzier|pro\s+monat|\/\s*monat)/iu;
const purchasePriceQualifier =
  /(?:kaufpreis|barpreis|fahrzeugpreis|gesamtpreis|verkaufspreis)/iu;

interface EvidenceLine {
  readonly text: string;
  readonly section: string;
}

function collectEvidenceLines(markdown: string): EvidenceLine[] {
  const lines: EvidenceLine[] = [];
  let section = "Dokument";

  for (const rawLine of markdown.split(/\r?\n/u)) {
    const text = rawLine.trim();
    const heading = /^#{1,6}\s+(.+)$/u.exec(text);
    if (heading?.[1]) {
      section = heading[1].trim();
      continue;
    }
    if (text.length > 0) {
      lines.push({ text, section });
    }
  }

  return lines;
}

function classifyEquipmentLine(text: string): EquipmentState {
  if (subscriptionQualifier.test(text)) {
    return "SUBSCRIPTION_REQUIRED";
  }
  if (preparationQualifier.test(text)) {
    return "PREPARED_ONLY";
  }
  if (absenceQualifier.test(text)) {
    return "ABSENT";
  }
  return "PRESENT";
}

function extractEquipmentClaim(
  lines: readonly EvidenceLine[],
  equipmentId: EquipmentId,
): EquipmentClaim {
  const aliases = equipmentAliases[equipmentId];
  for (const line of lines) {
    if (aliases.some((alias) => alias.test(line.text))) {
      return {
        state: classifyEquipmentLine(line.text),
        evidenceText: line.text,
        sourceSection: line.section,
        confidence: 1,
      };
    }
  }

  return {
    state: "UNKNOWN",
    evidenceText: null,
    sourceSection: null,
    confidence: 0,
  };
}

function parseEuroAmount(text: string): number | null {
  const suffixMatch =
    /(?<amount>\d{1,3}(?:[.\s]\d{3})+|\d{4,6})(?:,\d{2})?\s*(?:€|EUR)/iu.exec(
      text,
    );
  const prefixMatch =
    /(?:€|EUR)\s*(?<amount>\d{1,3}(?:[.\s]\d{3})+|\d{4,6})(?:,\d{2})?/iu.exec(
      text,
    );
  const amount = suffixMatch?.groups?.amount ?? prefixMatch?.groups?.amount;
  if (!amount) {
    return null;
  }

  const parsed = Number.parseInt(amount.replace(/[.\s]/gu, ""), 10);
  return parsed >= 5_000 && parsed <= 500_000 ? parsed : null;
}

function extractPrice(lines: readonly EvidenceLine[]) {
  const candidates = lines
    .filter(({ text }) => !monthlyPriceQualifier.test(text))
    .map((line) => ({ ...line, value: parseEuroAmount(line.text) }))
    .filter(
      (candidate): candidate is EvidenceLine & { value: number } =>
        candidate.value !== null,
    );
  const candidate =
    candidates.find(({ text }) => purchasePriceQualifier.test(text)) ??
    candidates[0];

  if (!candidate) {
    return undefined;
  }

  return {
    value: candidate.value,
    evidenceText: candidate.text,
    sourceSection: candidate.section,
    confidence: 1,
  } as const;
}

export function extractSnapshot(markdown: string): ExtractionEnvelope {
  const lines = collectEvidenceLines(markdown);
  const price = extractPrice(lines);
  const equipment = Object.fromEntries(
    equipmentIds.map((equipmentId) => [
      equipmentId,
      extractEquipmentClaim(lines, equipmentId),
    ]),
  );

  return extractionEnvelopeSchema.parse({
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    extractorId: "headless-reference-proof",
    extractorVersion: "0.1.0",
    snapshotSha256: createHash("sha256").update(markdown).digest("hex"),
    fields: price ? { price } : {},
    equipment,
    diagnostics: price
      ? []
      : [
          {
            code: "PRICE_NOT_FOUND",
            severity: "WARNING",
            message: "No purchase price with literal evidence was found",
          },
        ],
  });
}
