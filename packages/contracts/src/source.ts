import { z } from "zod";

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

export const pageKindSchema = z.enum(["SEARCH", "DETAIL"]);
export const expectedFetchOutcomeSchema = z.enum([
  "FETCHED",
  "PARTIAL",
  "FETCH_FAILED",
]);
export const fixtureSplitSchema = z.enum(["DEV", "TEST"]);

export const sourceFixtureSchema = z.strictObject({
  fixtureId: z.string().trim().min(1),
  domain: z.hostname(),
  canonicalUrl: z.url({ protocol: /^https$/ }),
  pageKind: pageKindSchema,
  expectedFetchOutcome: expectedFetchOutcomeSchema,
  capturedAt: z.iso.datetime({ offset: true }),
  contentSha256: sha256Schema,
  split: fixtureSplitSchema,
});

export type PageKind = z.infer<typeof pageKindSchema>;
export type ExpectedFetchOutcome = z.infer<typeof expectedFetchOutcomeSchema>;
export type FixtureSplit = z.infer<typeof fixtureSplitSchema>;
export type SourceFixture = z.infer<typeof sourceFixtureSchema>;
