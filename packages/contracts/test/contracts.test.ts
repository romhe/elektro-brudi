import { describe, expect, expectTypeOf, it } from "vitest";
import type { ExtractionEnvelope } from "../src/index.js";
import { extractionEnvelopeSchema, sourceFixtureSchema } from "../src/index.js";

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
    expect(() =>
      sourceFixtureSchema.parse({ ...validSource, pageKind }),
    ).toThrow();
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

  it("rejects claims without evidence", () => {
    expect(() =>
      extractionEnvelopeSchema.parse({
        ...validExtraction,
        fields: {
          price: {
            value: 29990,
            evidenceText: null,
            sourceSection: null,
            confidence: 0.99,
          },
        },
      }),
    ).toThrow();
  });

  it.each([
    "availabilityStatus",
    "sold",
    "verificationStatus",
    "monthlyPayment",
  ])("rejects forbidden extraction field %s", (fieldName) => {
    expect(() =>
      extractionEnvelopeSchema.parse({
        ...validExtraction,
        fields: {
          ...validExtraction.fields,
          [fieldName]: validExtraction.fields.price,
        },
      }),
    ).toThrow();
  });

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
