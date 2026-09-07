import { createHash } from "node:crypto";
import {
  EXTRACTION_SCHEMA_VERSION,
  extractionEnvelopeSchema,
} from "@elektro-brudi/contracts";
import { CRAWL4AI_BASE_URL } from "./crawl4ai-client.ts";

export interface ReferenceSource {
  readonly id: string;
  readonly url: string;
}

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
] as const satisfies readonly ReferenceSource[];

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

type EquipmentState =
  "PRESENT" | "ABSENT" | "UNKNOWN" | "PREPARED_ONLY" | "SUBSCRIPTION_REQUIRED";

interface EquipmentClaim {
  readonly state: EquipmentState;
  readonly evidenceText: string | null;
  readonly sourceSection: string | null;
  readonly confidence: number;
}

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
const absenceQualifier = /(?:nicht\s+vorhanden|nicht\s+verbaut|entfällt)/iu;
const purchasePriceQualifier =
  /(?:kaufpreis|barpreis|fahrzeugpreis|gesamtpreis|verkaufspreis)/iu;
const nonPurchasePriceQualifier =
  /(?:ehem(?:alig)?|empfohlen|\bUPE\b|listenpreis|ersparnis|\bsparen\b|anzahlung|kreditbetrag|schlussrate)/iu;

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

function boundedEvidence(
  text: string,
  matchStart: number,
  matchLength: number,
  maximumLength = 240,
): string {
  if (text.length <= maximumLength) {
    return text.trim();
  }

  const matchCenter = matchStart + Math.floor(matchLength / 2);
  const maximumStart = text.length - maximumLength;
  const start = Math.max(
    0,
    Math.min(maximumStart, matchCenter - Math.floor(maximumLength / 2)),
  );
  return text.slice(start, start + maximumLength).trim();
}

function clauseAt(
  text: string,
  matchStart: number,
): {
  readonly text: string;
  readonly offset: number;
} {
  const before = text.slice(0, matchStart);
  const previousDelimiter = Math.max(
    before.lastIndexOf(","),
    before.lastIndexOf(";"),
    before.lastIndexOf("|"),
  );
  const remainder = text.slice(matchStart);
  const nextDelimiterOffset = remainder.search(/[,;|]/u);
  const start = previousDelimiter + 1;
  const end =
    nextDelimiterOffset === -1 ? text.length : matchStart + nextDelimiterOffset;
  const leadingWhitespace =
    /^\s*/u.exec(text.slice(start, end))?.[0].length ?? 0;

  return {
    text: text.slice(start, end).trim(),
    offset: start + leadingWhitespace,
  };
}

function classifyEquipmentClause(
  text: string,
  matchStart: number,
  matchLength: number,
): EquipmentState {
  if (subscriptionQualifier.test(text)) {
    return "SUBSCRIPTION_REQUIRED";
  }
  if (preparationQualifier.test(text)) {
    return "PREPARED_ONLY";
  }
  const beforeAlias = text.slice(0, matchStart);
  const afterAlias = text.slice(matchStart + matchLength);
  if (
    /\b(?:ohne|no|kein(?:e|en|er|es)?)\s*$/iu.test(beforeAlias) ||
    absenceQualifier.test(afterAlias)
  ) {
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
    for (const alias of aliases) {
      const lineMatch = alias.exec(line.text);
      if (!lineMatch) {
        continue;
      }
      const clause = clauseAt(line.text, lineMatch.index);
      const clauseMatchStart = lineMatch.index - clause.offset;
      return {
        state: classifyEquipmentClause(
          clause.text,
          clauseMatchStart,
          lineMatch[0].length,
        ),
        evidenceText: boundedEvidence(
          clause.text,
          clauseMatchStart,
          lineMatch[0].length,
        ),
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

interface EuroAmount {
  readonly value: number;
  readonly start: number;
  readonly end: number;
}

function parseEuroAmounts(text: string): EuroAmount[] {
  const suffixMatches = text.matchAll(
    /(?<amount>\d{1,3}(?:[.\s]\d{3})+|\d{4,6})(?:,\d{2})?\s*(?:€|EUR)/giu,
  );
  const prefixMatches = text.matchAll(
    /(?:€|EUR)\s*(?<amount>\d{1,3}(?:[.\s]\d{3})+|\d{4,6})(?:,\d{2})?/giu,
  );

  return [...suffixMatches, ...prefixMatches]
    .map((match) => {
      const amount = match.groups?.amount;
      if (amount === undefined || match.index === undefined) {
        return null;
      }
      return {
        value: Number.parseInt(amount.replace(/[.\s]/gu, ""), 10),
        start: match.index,
        end: match.index + match[0].length,
      };
    })
    .filter(
      (amount): amount is EuroAmount =>
        amount !== null && amount.value >= 5_000 && amount.value <= 500_000,
    )
    .sort((left, right) => left.start - right.start);
}

function extractPrice(lines: readonly EvidenceLine[]) {
  const candidates = lines
    .filter(({ text }) => !nonPurchasePriceQualifier.test(text))
    .map((line) => {
      const amounts = parseEuroAmounts(line.text);
      const purchaseMatch = purchasePriceQualifier.exec(line.text);
      const amount = purchaseMatch
        ? amounts.toSorted((left, right) => {
            const qualifierStart = purchaseMatch.index;
            const qualifierEnd = purchaseMatch.index + purchaseMatch[0].length;
            const distance = (candidate: EuroAmount) =>
              candidate.start >= qualifierEnd
                ? candidate.start - qualifierEnd
                : qualifierStart >= candidate.end
                  ? qualifierStart - candidate.end
                  : 0;
            return distance(left) - distance(right);
          })[0]
        : amounts.toSorted((left, right) => left.value - right.value)[0];
      return amount
        ? { ...line, amount, hasPurchaseLabel: !!purchaseMatch }
        : null;
    })
    .filter(
      (
        candidate,
      ): candidate is EvidenceLine & {
        amount: EuroAmount;
        hasPurchaseLabel: boolean;
      } => candidate !== null,
    );
  const candidate =
    candidates.find(
      ({ hasPurchaseLabel, section }) =>
        hasPurchaseLabel || purchasePriceQualifier.test(section),
    ) ?? candidates[0];

  if (!candidate) {
    return undefined;
  }

  return {
    value: candidate.amount.value,
    evidenceText: boundedEvidence(
      candidate.text,
      candidate.amount.start,
      candidate.amount.end - candidate.amount.start,
    ),
    sourceSection: candidate.section,
    confidence: 1,
  } as const;
}

export function extractSnapshot(markdown: string) {
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

export interface ProofSourceResult {
  readonly sourceId: string;
  readonly requestedUrl: string;
  readonly outcome: "FETCHED" | "PARTIAL" | "FETCH_FAILED";
  readonly apiStatus: number | null;
  readonly httpStatus: number | null;
  readonly finalUrl: string | null;
  readonly durationMs: number;
  readonly contentBytes: number | null;
  readonly contentSha256: string | null;
  readonly extraction: ReturnType<typeof extractSnapshot> | null;
  readonly error: string | null;
}

interface ProofTransportInput {
  readonly sourceId: string;
  readonly requestedUrl: string;
  readonly outcome: "FETCHED" | "PARTIAL" | "FETCH_FAILED";
  readonly apiStatus: number | null;
  readonly httpStatus: number | null;
  readonly finalUrl: string | null;
  readonly durationMs: number;
  readonly markdown: string | null;
  readonly error: string | null;
}

export interface ProofReport {
  readonly reportVersion: "1.0.0";
  readonly generatedAt: string;
  readonly crawl4ai: {
    readonly baseUrl: string;
    readonly version: string | null;
  };
  readonly summary: {
    readonly total: number;
    readonly fetched: number;
    readonly partial: number;
    readonly failed: number;
    readonly withPrice: number;
    readonly presentEquipmentClaims: number;
  };
  readonly results: readonly ProofSourceResult[];
}

export function buildProofReport(
  version: string | null,
  transports: readonly ProofTransportInput[],
  generatedAt: string = new Date().toISOString(),
): ProofReport {
  const results = transports.map((transport): ProofSourceResult => {
    const extraction = transport.markdown
      ? extractSnapshot(transport.markdown)
      : null;
    const hasOfferData =
      extraction !== null &&
      (extraction.fields.price?.value !== undefined ||
        Object.values(extraction.equipment).some(
          ({ state }) => state !== "UNKNOWN",
        ));
    const outcome =
      transport.outcome === "FETCHED" && !hasOfferData
        ? "PARTIAL"
        : transport.outcome;
    const error =
      transport.outcome === "FETCHED" && !hasOfferData
        ? "Crawl returned Markdown but no target offer data was extracted"
        : transport.error;

    return {
      sourceId: transport.sourceId,
      requestedUrl: transport.requestedUrl,
      outcome,
      apiStatus: transport.apiStatus,
      httpStatus: transport.httpStatus,
      finalUrl: transport.finalUrl,
      durationMs: transport.durationMs,
      contentBytes: transport.markdown
        ? Buffer.byteLength(transport.markdown, "utf8")
        : null,
      contentSha256: extraction?.snapshotSha256 ?? null,
      extraction,
      error,
    };
  });

  return {
    reportVersion: "1.0.0",
    generatedAt,
    crawl4ai: { baseUrl: CRAWL4AI_BASE_URL, version },
    summary: {
      total: results.length,
      fetched: results.filter(({ outcome }) => outcome === "FETCHED").length,
      partial: results.filter(({ outcome }) => outcome === "PARTIAL").length,
      failed: results.filter(({ outcome }) => outcome === "FETCH_FAILED")
        .length,
      withPrice: results.filter(
        ({ extraction }) => extraction?.fields.price?.value !== undefined,
      ).length,
      presentEquipmentClaims: results.reduce(
        (total, { extraction }) =>
          total +
          Object.values(extraction?.equipment ?? {}).filter(
            ({ state }) => state === "PRESENT",
          ).length,
        0,
      ),
    },
    results,
  };
}
