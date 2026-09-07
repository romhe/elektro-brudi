import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildProofReport,
  equipmentIds,
  extractSnapshot,
  referenceSources,
} from "../src/reference-suite.js";

describe("referenceSources", () => {
  it("contains the five approved real sources", () => {
    expect(referenceSources.map(({ id }) => id)).toEqual([
      "volkswagen",
      "feser-graf",
      "huelpert",
      "mobile-de",
      "tesla",
    ]);
    expect(referenceSources).toHaveLength(5);
    expect(referenceSources.at(-1)?.url).toContain("tesla.com/de_DE/m3/order/");
  });
});

describe("extractSnapshot", () => {
  it("extracts a purchase price and all ten representative attributes", () => {
    const markdown = `# VW ID.4

Monatliche Rate 299 EUR

## Fahrzeugpreis
Kaufpreis 29.990 EUR

## Ausstattung
Adaptive Cruise Control (ACC)
Travel Assist mit aktiver Spurzentrierung
Side Assist Spurwechselassistent
Rückfahrkamera
Area View 360-Grad-Kamera
IQ.LIGHT Matrix-LED-Scheinwerfer
Wärmepumpe
Batterie-Vorkonditionierung
Apple CarPlay und Android Auto
Anhängerkupplung schwenkbar
`;

    const extraction = extractSnapshot(markdown);

    expect(equipmentIds).toHaveLength(10);
    expect(extraction.snapshotSha256).toBe(
      createHash("sha256").update(markdown).digest("hex"),
    );
    expect(extraction.fields.price?.value).toBe(29_990);
    expect(extraction.fields.price?.evidenceText).toContain("29.990 EUR");

    for (const equipmentId of equipmentIds) {
      const claim = extraction.equipment[equipmentId];
      expect(claim?.state, equipmentId).toBe("PRESENT");
      expect(markdown).toContain(claim?.evidenceText ?? "missing evidence");
      expect(claim?.sourceSection).toBe("Ausstattung");
    }
  });

  it.each([
    ["ACC", "PRESENT"],
    ["ohne ACC", "ABSENT"],
    ["ACC optional gegen Aufpreis", "PREPARED_ONLY"],
    ["ACC nachträglich per Abonnement freischaltbar", "SUBSCRIPTION_REQUIRED"],
    ["Tempomat", "UNKNOWN"],
  ] as const)("maps %j to adaptive cruise state %s", (text, state) => {
    const claim = extractSnapshot(`## Ausstattung\n${text}`).equipment
      .adaptive_cruise_control;

    expect(claim?.state).toBe(state);
    if (state === "UNKNOWN") {
      expect(claim?.evidenceText).toBeNull();
      expect(claim?.sourceSection).toBeNull();
    } else {
      expect(text).toContain(claim?.evidenceText ?? "missing evidence");
    }
  });

  it.each([
    ["Lane Assist", "active_lane_centering"],
    ["Einparkhilfe PDC vorne und hinten", "reversing_camera"],
    ["Einparkhilfe PDC vorne und hinten", "surround_view_camera"],
    ["LED-Scheinwerfer", "matrix_pixel_led"],
    ["Standheizung", "heat_pump"],
  ] as const)("does not infer %s as %s", (text, equipmentId) => {
    expect(extractSnapshot(text).equipment[equipmentId]?.state).toBe("UNKNOWN");
  });

  it("classifies tow-bar preparation without claiming an installed tow bar", () => {
    const claim = extractSnapshot("## Nutzwert\nAHK-Vorbereitung").equipment
      .tow_bar;

    expect(claim?.state).toBe("PREPARED_ONLY");
    expect(claim?.evidenceText).toBe("AHK-Vorbereitung");
  });

  it("associates qualifiers with the matching equipment clause", () => {
    const markdown = `## Ausstattung
ACC ohne Aufpreis
ACC serienmäßig, Metallic-Lack optional gegen Aufpreis
Rückfahrkamera, Anhängerkupplung nicht vorhanden
`;
    const extraction = extractSnapshot(markdown);

    expect(extraction.equipment.adaptive_cruise_control?.state).toBe("PRESENT");
    expect(extraction.equipment.reversing_camera?.state).toBe("PRESENT");
    expect(extraction.equipment.tow_bar?.state).toBe("ABSENT");
  });

  it("bounds evidence while retaining an exact snapshot substring", () => {
    const markdown = `## Ausstattung\n${"vorher ".repeat(80)}ACC${" nachher".repeat(80)}`;
    const claim = extractSnapshot(markdown).equipment.adaptive_cruise_control;

    expect(claim?.state).toBe("PRESENT");
    expect(claim?.evidenceText?.length).toBeLessThanOrEqual(240);
    expect(markdown).toContain(claim?.evidenceText ?? "missing evidence");
  });

  it("leaves missing price and equipment unknown", () => {
    const extraction = extractSnapshot("# Fahrzeug\nKeine weiteren Angaben");

    expect(extraction.fields.price).toBeUndefined();
    expect(Object.values(extraction.equipment)).toHaveLength(10);
    expect(
      Object.values(extraction.equipment).every(
        ({ state, evidenceText, sourceSection }) =>
          state === "UNKNOWN" &&
          evidenceText === null &&
          sourceSection === null,
      ),
    ).toBe(true);
  });

  it("prefers a discounted purchase price over former list price evidence", () => {
    const markdown = `## Kaufpreis
40.820 €23.880 €
Sie sparen 16.940 €

## Weitere Informationen
Ehem. empfohlener Verkaufspreis (UPE) 40.820 EUR
`;

    const price = extractSnapshot(markdown).fields.price;

    expect(price?.value).toBe(23_880);
    expect(price?.evidenceText).toBe("40.820 €23.880 €");
    expect(price?.sourceSection).toBe("Kaufpreis");
  });

  it("associates purchase labels with their nearest amount", () => {
    const withAccessory = extractSnapshot(
      "Kaufpreis 29.990 EUR inklusive 10.000 EUR Sonderausstattung",
    );
    const withMonthlyRate = extractSnapshot(
      "Kaufpreis 29.990 EUR, Monatsrate 299 EUR",
    );

    expect(withAccessory.fields.price?.value).toBe(29_990);
    expect(withMonthlyRate.fields.price?.value).toBe(29_990);
  });

  it("keeps a labeled purchase price beside non-purchase amounts", () => {
    const withDownPayment = extractSnapshot(
      "Kaufpreis 29.990 EUR, Anzahlung 5.000 EUR",
    );
    const withListPrice = extractSnapshot(
      "Kaufpreis 29.990 EUR, UPE 39.990 EUR",
    );

    expect(withDownPayment.fields.price?.value).toBe(29_990);
    expect(withListPrice.fields.price?.value).toBe(29_990);
  });
});

describe("buildProofReport", () => {
  it("keeps every outcome while omitting complete snapshot content", () => {
    const markdown =
      "## Fahrzeugpreis\nKaufpreis 29.990 EUR\n## Ausstattung\nACC\n";
    const transports = [
      {
        sourceId: "one",
        requestedUrl: "https://dealer.example/one",
        outcome: "FETCHED",
        apiStatus: 200,
        httpStatus: 200,
        finalUrl: "https://dealer.example/one",
        durationMs: 125,
        markdown,
        error: null,
      },
      {
        sourceId: "two",
        requestedUrl: "https://dealer.example/two",
        outcome: "FETCH_FAILED",
        apiStatus: 200,
        httpStatus: 403,
        finalUrl: "https://dealer.example/two",
        durationMs: 250,
        markdown: null,
        error: "Blocked by target",
      },
      {
        sourceId: "three",
        requestedUrl: "https://dealer.example/three",
        outcome: "PARTIAL",
        apiStatus: 200,
        httpStatus: 200,
        finalUrl: "https://dealer.example/three",
        durationMs: 75,
        markdown: null,
        error: "Crawl succeeded without usable Markdown",
      },
    ] as const;

    const report = buildProofReport(
      "0.9.3",
      transports,
      "2026-09-07T15:00:00.000Z",
    );

    expect(report.generatedAt).toBe("2026-09-07T15:00:00.000Z");
    expect(report.crawl4ai.version).toBe("0.9.3");
    expect(report.summary).toEqual({
      total: 3,
      fetched: 1,
      partial: 1,
      failed: 1,
      withPrice: 1,
      presentEquipmentClaims: 1,
    });
    expect(
      report.results.map(({ sourceId, outcome }) => [sourceId, outcome]),
    ).toEqual([
      ["one", "FETCHED"],
      ["two", "FETCH_FAILED"],
      ["three", "PARTIAL"],
    ]);
    expect(report.results[0]?.contentBytes).toBe(Buffer.byteLength(markdown));
    expect(report.results[0]?.contentSha256).toBe(
      createHash("sha256").update(markdown).digest("hex"),
    );
    expect(report.results[0]?.extraction?.fields.price?.value).toBe(29_990);
    expect(report.results[0]?.extraction?.equipment).toHaveProperty(
      "adaptive_cruise_control.state",
      "PRESENT",
    );
    expect(report.results[1]?.extraction).toBeNull();
    expect(JSON.stringify(report)).not.toContain(markdown);
  });

  it("marks a fetched shell without offer data as partial", () => {
    const report = buildProofReport(
      "0.9.3",
      [
        {
          sourceId: "shell",
          requestedUrl: "https://manufacturer.example/car",
          outcome: "FETCHED",
          apiStatus: 200,
          httpStatus: 200,
          finalUrl: "https://manufacturer.example/car",
          durationMs: 100,
          markdown: "# Navigation\nModelle\nService\nImpressum",
          error: null,
        },
      ],
      "2026-09-07T15:00:00.000Z",
    );

    expect(report.results[0]).toMatchObject({
      outcome: "PARTIAL",
      error: "Crawl returned Markdown but no target offer data was extracted",
    });
    expect(report.summary).toMatchObject({ fetched: 0, partial: 1, failed: 0 });
  });
});
