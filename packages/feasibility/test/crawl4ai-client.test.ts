import { describe, expect, it, vi } from "vitest";
import {
  crawlReferenceSources,
  readCrawl4AIToken,
  type SecurityRunner,
} from "../src/crawl4ai-client.js";
import type { ReferenceSource } from "../src/reference-suite.js";

const sources = [
  { id: "one", url: "https://dealer.example/one" },
  { id: "two", url: "https://dealer.example/two" },
  { id: "three", url: "https://dealer.example/three" },
] as const satisfies readonly ReferenceSource[];

describe("readCrawl4AIToken", () => {
  it("uses the fixed Keychain executable and argument array", async () => {
    const runner: SecurityRunner = vi.fn(async () => " secret-value\n");

    await expect(readCrawl4AIToken(runner)).resolves.toBe("secret-value");
    expect(runner).toHaveBeenCalledWith("/usr/bin/security", [
      "find-generic-password",
      "-a",
      "default",
      "-s",
      "de.elektrobrudi.crawl4ai",
      "-w",
    ]);
  });

  it("rejects an empty credential without exposing secret output", async () => {
    await expect(readCrawl4AIToken(async () => " \n")).rejects.toThrow(
      "Crawl4AI credential is missing",
    );
  });
});

describe("crawlReferenceSources", () => {
  it("measures and normalizes every source independently", async () => {
    const token = "sentinel-secret";
    const requests: Array<{ url: string; authorization: string | null }> = [];
    let crawlIndex = 0;
    const fetchImplementation = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/health")) {
          return Response.json({ status: "ok", version: "0.9.3" });
        }

        requests.push({
          url,
          authorization: new Headers(init?.headers).get("authorization"),
        });
        const source = sources[crawlIndex++];
        if (source?.id === "two") {
          return Response.json(
            { detail: `request rejected ${token}` },
            { status: 429 },
          );
        }
        if (source?.id === "three") {
          throw new Error(`network failed with ${token}`);
        }

        return Response.json({
          success: true,
          results: [
            {
              url: source?.url,
              redirected_url: "https://dealer.example/final",
              success: true,
              status_code: 200,
              markdown: {
                fit_markdown: "## Fit\nKaufpreis 29.990 EUR",
                raw_markdown: "## Raw\nIgnored",
              },
            },
          ],
        });
      },
    );
    let instant = 0;

    const result = await crawlReferenceSources({
      sources,
      token,
      fetchImplementation: fetchImplementation as typeof fetch,
      now: () => (instant += 25),
    });

    expect(result.version).toBe("0.9.3");
    expect(
      result.results.map(({ sourceId, outcome }) => [sourceId, outcome]),
    ).toEqual([
      ["one", "FETCHED"],
      ["two", "FETCH_FAILED"],
      ["three", "FETCH_FAILED"],
    ]);
    expect(result.results[0]).toMatchObject({
      requestedUrl: sources[0].url,
      finalUrl: "https://dealer.example/final",
      httpStatus: 200,
      durationMs: 25,
      markdown: "## Fit\nKaufpreis 29.990 EUR",
    });
    expect(result.results[1]?.error).toContain("HTTP 429");
    expect(result.results[2]?.error).toContain("network failed");
    expect(JSON.stringify(result)).not.toContain(token);
    expect(requests).toHaveLength(3);
    expect(requests.every(({ url }) => url.endsWith("/crawl"))).toBe(true);
    expect(
      requests.every(
        ({ authorization }) => authorization === `Bearer ${token}`,
      ),
    ).toBe(true);
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
  });

  it("classifies successful pages without usable Markdown as partial", async () => {
    const fetchImplementation = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith("/health")) {
        return Response.json({ status: "ok", version: "0.9.3" });
      }
      return Response.json({
        success: true,
        results: [{ success: true, status_code: 200, markdown: {} }],
      });
    });

    const result = await crawlReferenceSources({
      sources: sources.slice(0, 1),
      token: "secret",
      fetchImplementation: fetchImplementation as typeof fetch,
      now: () => 0,
    });

    expect(result.results[0]).toMatchObject({
      outcome: "PARTIAL",
      error: "Crawl succeeded without usable Markdown",
    });
  });
});
