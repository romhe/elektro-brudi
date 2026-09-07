export const PROOF_SOURCE_TEXT =
  "VW ID.4 Pro Performance, Kaufpreis 23.880 EUR, Automatische Distanzregelung ACC, Apple CarPlay";

export interface MinimalExtraction {
  readonly model: string;
  readonly price_eur: number;
}

export const proofMessages = [
  {
    role: "system" as const,
    content:
      "Du extrahierst Fahrzeugdaten. Antworte ausschließlich mit einem JSON-Objekt " +
      'mit genau zwei Schlüsseln: "model" (Zeichenkette) und "price_eur" (Ganzzahl). ' +
      "Keine weiteren Schlüssel, kein Text außerhalb des JSON.",
  },
  { role: "user" as const, content: PROOF_SOURCE_TEXT },
];

function stripThinking(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/gu, "").trim();
}

export function parseModelOutput(raw: string): MinimalExtraction {
  const text = stripThinking(raw);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("The model output contains no JSON object");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("The model output is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("The model output is not a JSON object");
  }

  const keys = Object.keys(parsed).sort();
  if (keys.join(",") !== "model,price_eur") {
    throw new Error(`Unexpected JSON keys: ${keys.join(", ") || "none"}`);
  }
  const { model, price_eur: priceEur } = parsed as Record<string, unknown>;
  if (typeof model !== "string" || model.trim().length === 0) {
    throw new Error("model must be a non-empty string");
  }
  if (!Number.isInteger(priceEur) || (priceEur as number) <= 0) {
    throw new Error("price_eur must be a positive integer");
  }

  return { model: model.trim(), price_eur: priceEur as number };
}
