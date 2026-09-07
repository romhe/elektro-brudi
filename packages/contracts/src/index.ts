export {
  EXTRACTION_SCHEMA_VERSION,
  diagnosticSeveritySchema,
  equipmentClaimSchema,
  equipmentStateSchema,
  extractionDiagnosticSchema,
  extractionEnvelopeSchema,
  extractionFieldSchema,
  extractionFieldValueSchema,
} from "./extraction.js";
export type {
  DiagnosticSeverity,
  EquipmentClaim,
  EquipmentState,
  ExtractionDiagnostic,
  ExtractionEnvelope,
  ExtractionField,
  ExtractionFieldValue,
} from "./extraction.js";

export {
  expectedFetchOutcomeSchema,
  fixtureSplitSchema,
  pageKindSchema,
  sourceFixtureSchema,
} from "./source.js";
export type {
  ExpectedFetchOutcome,
  FixtureSplit,
  PageKind,
  SourceFixture,
} from "./source.js";
