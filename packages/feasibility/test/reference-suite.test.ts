import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
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
});
