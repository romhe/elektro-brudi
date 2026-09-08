import { describe, expect, it } from "vitest";
import {
  minimalExtractionSchema,
  parseModelOutput,
  proofMessages,
} from "../src/lib/model-output.js";

describe("parseModelOutput", () => {
  it("accepts the minimal JSON object", () => {
    expect(
      parseModelOutput('{"model":"VW ID.4 Pro Performance","price_eur":23880}'),
    ).toEqual({ model: "VW ID.4 Pro Performance", price_eur: 23_880 });
  });

  it("strips Qwen3 thinking blocks and surrounding prose", () => {
    expect(
      parseModelOutput(
        '<think>\nlet me see\n</think>\nHier ist das JSON:\n```json\n{"model": "ID.4", "price_eur": 23880}\n```',
      ),
    ).toEqual({ model: "ID.4", price_eur: 23_880 });
  });

  it.each([
    ["no json here", "contains no JSON object"],
    ["{not json}", "not valid JSON"],
    ["[1,2]", "contains no JSON object"],
    ['{"model":"ID.4"}', "Unexpected JSON keys: model"],
    [
      '{"model":"ID.4","price_eur":23880,"monthly_rate":199}',
      "Unexpected JSON keys",
    ],
    ['{"model":"","price_eur":23880}', "non-empty string"],
    ['{"model":"ID.4","price_eur":"23880"}', "positive integer"],
    ['{"model":"ID.4","price_eur":-5}', "positive integer"],
    ['{"model":"ID.4","price_eur":23880.5}', "positive integer"],
  ])("rejects %s", (raw, reason) => {
    expect(() => parseModelOutput(raw)).toThrow(reason);
  });

  it("asks only for the two allowed keys", () => {
    expect(proofMessages[0]?.content).toContain('"model"');
    expect(proofMessages[0]?.content).toContain('"price_eur"');
    expect(proofMessages[0]?.content).not.toMatch(/rate|kredit|leasing/iu);
  });

  it("ships a strict schema string for the grammar compiler", () => {
    const schema = JSON.parse(minimalExtractionSchema);
    expect(schema.required).toEqual(["model", "price_eur"]);
    expect(schema.additionalProperties).toBe(false);
    expect(Object.keys(schema.properties)).toEqual(["model", "price_eur"]);
  });
});
