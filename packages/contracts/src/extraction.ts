import { z } from "zod";

export const EXTRACTION_SCHEMA_VERSION = "1.0.0" as const;

const nonEmptyStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0);
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

export const extractionFieldIdSchema = z.enum(["price"]);

export const extractionFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const extractionFieldSchema = z
  .strictObject({
    value: extractionFieldValueSchema,
    evidenceText: nonEmptyStringSchema.nullable(),
    sourceSection: nonEmptyStringSchema.nullable(),
    confidence: z.number().min(0).max(1),
  })
  .superRefine((field, context) => {
    if (field.value === null) {
      return;
    }

    if (field.evidenceText === null) {
      context.addIssue({
        code: "custom",
        message: "Non-null field values require evidence text",
        path: ["evidenceText"],
      });
    }

    if (field.sourceSection === null) {
      context.addIssue({
        code: "custom",
        message: "Non-null field values require a source section",
        path: ["sourceSection"],
      });
    }
  });

export const equipmentStateSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "UNKNOWN",
  "PREPARED_ONLY",
  "SUBSCRIPTION_REQUIRED",
]);

export const equipmentClaimSchema = z
  .strictObject({
    state: equipmentStateSchema,
    evidenceText: nonEmptyStringSchema.nullable(),
    sourceSection: nonEmptyStringSchema.nullable(),
    confidence: z.number().min(0).max(1),
  })
  .superRefine((claim, context) => {
    if (claim.state === "UNKNOWN") {
      return;
    }

    if (claim.evidenceText == null) {
      context.addIssue({
        code: "custom",
        message: "Equipment claims require evidence text",
        path: ["evidenceText"],
      });
    }

    if (claim.sourceSection == null) {
      context.addIssue({
        code: "custom",
        message: "Equipment claims require a source section",
        path: ["sourceSection"],
      });
    }
  });

export const diagnosticSeveritySchema = z.enum(["INFO", "WARNING", "ERROR"]);
export const extractionDiagnosticSchema = z.strictObject({
  code: nonEmptyStringSchema,
  severity: diagnosticSeveritySchema,
  message: nonEmptyStringSchema,
});

export const extractionEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(EXTRACTION_SCHEMA_VERSION),
  extractorId: nonEmptyStringSchema,
  extractorVersion: nonEmptyStringSchema,
  snapshotSha256: sha256Schema,
  fields: z.partialRecord(extractionFieldIdSchema, extractionFieldSchema),
  equipment: z.record(nonEmptyStringSchema, equipmentClaimSchema),
  diagnostics: z.array(extractionDiagnosticSchema),
});

export type ExtractionFieldValue = z.infer<typeof extractionFieldValueSchema>;
export type ExtractionFieldId = z.infer<typeof extractionFieldIdSchema>;
export type ExtractionField = z.infer<typeof extractionFieldSchema>;
export type EquipmentState = z.infer<typeof equipmentStateSchema>;
export type EquipmentClaim = z.infer<typeof equipmentClaimSchema>;
export type DiagnosticSeverity = z.infer<typeof diagnosticSeveritySchema>;
export type ExtractionDiagnostic = z.infer<typeof extractionDiagnosticSchema>;
export type ExtractionEnvelope = z.infer<typeof extractionEnvelopeSchema>;
