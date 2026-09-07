import { describe, expect, expectTypeOf, it } from "vitest";
import type { ExtractionEnvelope, SourceFixture } from "../src/index.js";
import { extractionEnvelopeSchema, sourceFixtureSchema } from "../src/index.js";

const forbiddenExtractionKeys = [
  ["finance", "monthlyPayment"],
  ["leasing", "leasingRate"],
  ["availability", "availabilityStatus"],
  ["sold", "sold"],
  ["verification", "verificationStatus"],
] as const;

const forbiddenVehicleFieldKeys = [
  "monthlyPayment",
  "leasingRate",
  "availabilityStatus",
  "sold",
  "verificationStatus",
  "MonthlyPayment",
  "monthly_payment",
  "creditAmount",
  "loanAmount",
  "downPayment",
  "balloonPayment",
  "interestRate",
  "financeAmount",
  "financingOffer",
  "leaseRate",
  "APR_rate",
] as const;

const validSource = {
  fixtureId: "dealer-detail-001",
  domain: "dealer.example",
  canonicalUrl: "https://dealer.example/cars/001",
  pageKind: "DETAIL",
  expectedFetchOutcome: "FETCHED",
  capturedAt: "2026-09-07T10:00:00.000Z",
  contentSha256: "a".repeat(64),
  split: "DEV",
} satisfies SourceFixture;

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
} satisfies ExtractionEnvelope;

describe("sourceFixtureSchema", () => {
  it("accepts a valid source fixture", () => {
    expect(sourceFixtureSchema.parse(validSource)).toEqual(validSource);
  });

  it.each(["LISTING", "UNKNOWN"])("rejects page kind %s", (pageKind) => {
    expect(() =>
      sourceFixtureSchema.parse({ ...validSource, pageKind }),
    ).toThrow();
  });

  it("accepts a search page", () => {
    const searchSource = { ...validSource, pageKind: "SEARCH" } as const;
    expect(sourceFixtureSchema.parse(searchSource)).toEqual(searchSource);
  });

  it("rejects an unknown fetch outcome", () => {
    expect(() =>
      sourceFixtureSchema.parse({
        ...validSource,
        expectedFetchOutcome: "SOLD",
      }),
    ).toThrow();
  });

  it("rejects a non-HTTPS canonical URL", () => {
    expect(() =>
      sourceFixtureSchema.parse({
        ...validSource,
        canonicalUrl: "http://dealer.example/001",
      }),
    ).toThrow();
  });

  it("rejects an invalid content SHA-256", () => {
    expect(() =>
      sourceFixtureSchema.parse({
        ...validSource,
        contentSha256: "not-a-sha-256",
      }),
    ).toThrow();
  });

  it("rejects an invalid capture timestamp", () => {
    expect(() =>
      sourceFixtureSchema.parse({
        ...validSource,
        capturedAt: "not-a-timestamp",
      }),
    ).toThrow();
  });
});

describe("extractionEnvelopeSchema", () => {
  it("accepts an evidence-bearing extraction", () => {
    expect(extractionEnvelopeSchema.parse(validExtraction)).toEqual(
      validExtraction,
    );
  });

  it("rejects a missing schema version", () => {
    const { schemaVersion: _schemaVersion, ...withoutVersion } =
      validExtraction;
    void _schemaVersion;
    expect(() => extractionEnvelopeSchema.parse(withoutVersion)).toThrow();
  });

  it("rejects an unknown equipment state", () => {
    expect(() =>
      extractionEnvelopeSchema.parse({
        ...validExtraction,
        equipment: {
          heat_pump: {
            ...validExtraction.equipment.heat_pump,
            state: "MAYBE",
          },
        },
      }),
    ).toThrow();
  });

  it.each([
    ["evidence text", "evidenceText"],
    ["source section", "sourceSection"],
  ] as const)("rejects a non-null field claim without %s", (_label, key) => {
    expect(() =>
      extractionEnvelopeSchema.parse({
        ...validExtraction,
        fields: {
          price: {
            ...validExtraction.fields.price,
            [key]: null,
          },
        },
      }),
    ).toThrow();
  });

  it.each([
    ["PRESENT", "evidence text", "evidenceText"],
    ["PRESENT", "source section", "sourceSection"],
    ["ABSENT", "evidence text", "evidenceText"],
    ["ABSENT", "source section", "sourceSection"],
    ["PREPARED_ONLY", "evidence text", "evidenceText"],
    ["PREPARED_ONLY", "source section", "sourceSection"],
    ["SUBSCRIPTION_REQUIRED", "evidence text", "evidenceText"],
    ["SUBSCRIPTION_REQUIRED", "source section", "sourceSection"],
  ] as const)(
    "rejects a %s equipment claim without %s",
    (state, _label, key) => {
      expect(() =>
        extractionEnvelopeSchema.parse({
          ...validExtraction,
          equipment: {
            heat_pump: {
              ...validExtraction.equipment.heat_pump,
              state,
              [key]: null,
            },
          },
        }),
      ).toThrow();
    },
  );

  it("accepts UNKNOWN equipment without evidence", () => {
    const unknownExtraction = {
      ...validExtraction,
      equipment: {
        heat_pump: {
          ...validExtraction.equipment.heat_pump,
          state: "UNKNOWN",
          evidenceText: null,
          sourceSection: null,
        },
      },
    } as const;

    expect(extractionEnvelopeSchema.parse(unknownExtraction)).toEqual(
      unknownExtraction,
    );
  });

  it.each([
    [
      "evidence text",
      {
        state: "UNKNOWN",
        sourceSection: null,
        confidence: 0.98,
      },
    ],
    [
      "source section",
      {
        state: "UNKNOWN",
        evidenceText: null,
        confidence: 0.98,
      },
    ],
  ] as const)("rejects UNKNOWN equipment with omitted %s", (_label, claim) => {
    expect(() =>
      extractionEnvelopeSchema.parse({
        ...validExtraction,
        equipment: { heat_pump: claim },
      }),
    ).toThrow();
  });

  it("rejects an invalid snapshot SHA-256", () => {
    expect(() =>
      extractionEnvelopeSchema.parse({
        ...validExtraction,
        snapshotSha256: "not-a-sha-256",
      }),
    ).toThrow();
  });

  it.each(forbiddenExtractionKeys)(
    "rejects forbidden top-level %s property %s",
    (_category, fieldName) => {
      expect(() =>
        extractionEnvelopeSchema.parse({
          ...validExtraction,
          [fieldName]: "outside-the-extraction-boundary",
        }),
      ).toThrow();
    },
  );

  it.each(forbiddenVehicleFieldKeys)(
    "rejects forbidden field %s",
    (fieldName) => {
      expect(() =>
        extractionEnvelopeSchema.parse({
          ...validExtraction,
          fields: {
            ...validExtraction.fields,
            [fieldName]: validExtraction.fields.price,
          },
        }),
      ).toThrow();
    },
  );

  it.each([
    ["field", { fields: { "   ": validExtraction.fields.price } }],
    [
      "equipment",
      { equipment: { "   ": validExtraction.equipment.heat_pump } },
    ],
  ] as const)("rejects a whitespace-only %s key", (_label, override) => {
    expect(() =>
      extractionEnvelopeSchema.parse({ ...validExtraction, ...override }),
    ).toThrow();
  });

  it("preserves permitted field and equipment keys", () => {
    const extractionWithOriginalKeys = {
      ...validExtraction,
      fields: { " releaseDate ": validExtraction.fields.price },
      equipment: {
        " heat_pump ": validExtraction.equipment.heat_pump,
      },
    };

    expect(extractionEnvelopeSchema.parse(extractionWithOriginalKeys)).toEqual(
      extractionWithOriginalKeys,
    );
  });

  it("excludes forbidden top-level properties from the TypeScript type", () => {
    type ForbiddenTopLevelKey = (typeof forbiddenExtractionKeys)[number][1];
    type ForbiddenTopLevelOverlap = Extract<
      keyof ExtractionEnvelope,
      ForbiddenTopLevelKey
    >;

    expectTypeOf<ForbiddenTopLevelOverlap>().toEqualTypeOf<never>();

    const envelope: ExtractionEnvelope = validExtraction;
    void envelope;

    const withAvailability: ExtractionEnvelope = {
      ...validExtraction,
      // @ts-expect-error availability decisions are outside the LLM contract
      availabilityStatus: "AVAILABLE",
    };
    void withAvailability;
  });
});
