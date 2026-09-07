import { crawlReferenceSources, readCrawl4AIToken } from "./crawl4ai-client.ts";
import { buildProofReport, referenceSources } from "./reference-suite.ts";

function failureResults(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown suite failure";
  return referenceSources.map((source) => ({
    sourceId: source.id,
    requestedUrl: source.url,
    outcome: "FETCH_FAILED" as const,
    apiStatus: null,
    httpStatus: null,
    finalUrl: null,
    durationMs: 0,
    markdown: null,
    error: message,
  }));
}

async function main(): Promise<void> {
  try {
    const token = await readCrawl4AIToken();
    const transport = await crawlReferenceSources({
      sources: referenceSources,
      token,
    });
    const report = buildProofReport(transport.version, transport.results);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (transport.suiteFailure) {
      process.exitCode = 1;
    }
  } catch (error) {
    const report = buildProofReport(null, failureResults(error));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
  }
}

await main();
