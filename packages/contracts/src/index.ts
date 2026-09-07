export {
  EXTRACTION_SCHEMA_VERSION,
  diagnosticSeveritySchema,
  equipmentClaimSchema,
  equipmentStateSchema,
  extractionDiagnosticSchema,
  extractionEnvelopeSchema,
  extractionFieldIdSchema,
  extractionFieldSchema,
  extractionFieldValueSchema,
} from "./extraction.ts";
export type {
  DiagnosticSeverity,
  EquipmentClaim,
  EquipmentState,
  ExtractionDiagnostic,
  ExtractionEnvelope,
  ExtractionField,
  ExtractionFieldId,
  ExtractionFieldValue,
} from "./extraction.ts";

export {
  expectedFetchOutcomeSchema,
  fixtureSplitSchema,
  pageKindSchema,
  sourceFixtureSchema,
} from "./source.ts";
export type {
  ExpectedFetchOutcome,
  FixtureSplit,
  PageKind,
  SourceFixture,
} from "./source.ts";
