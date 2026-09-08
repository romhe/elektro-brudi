import { describe, expect, it } from "vitest";
import {
  assertPublicHttpsTarget,
  assertPublicHttpsUrl,
  createRequestPolicy,
} from "../src/url-policy.js";

describe("assertPublicHttpsUrl", () => {
  it("accepts public https URLs and keeps the query string", () => {
    const url = assertPublicHttpsUrl("https://example.com/path?x=1#frag");
    expect(url.href).toBe("https://example.com/path?x=1#frag");
    expect(assertPublicHttpsUrl("https://example.com:443/").href).toBe(
      "https://example.com/",
    );
  });

  it.each([
    ["not a url", "The URL is not valid"],
    ["http://example.com/", "Only https URLs are allowed"],
    ["ftp://example.com/", "Only https URLs are allowed"],
    ["https://user:secret@example.com/", "user information"],
    ["https://user@example.com/", "user information"],
    ["https://example.com:8443/", "default https port"],
    ["https://localhost/", "Local hostnames"],
    ["https://printer.local/", "Local hostnames"],
    ["https://127.0.0.1/", "Private or loopback"],
    ["https://10.1.2.3/", "Private or loopback"],
    ["https://172.16.0.9/", "Private or loopback"],
    ["https://192.168.1.1/", "Private or loopback"],
    ["https://169.254.169.254/", "Private or loopback"],
    ["https://100.64.0.1/", "Private or loopback"],
    ["https://0.0.0.0/", "Private or loopback"],
    ["https://[::1]/", "Private or loopback"],
    ["https://[fd00::1]/", "Private or loopback"],
    ["https://[fe80::1]/", "Private or loopback"],
    ["https://[::ffff:127.0.0.1]/", "Private or loopback"],
    ["https://intranet/", "publicly resolvable"],
  ])("rejects %s", (input, reason) => {
    expect(() => assertPublicHttpsUrl(input)).toThrow(reason);
  });
});

const lookupTable: Record<string, { address: string; family: number }[]> = {
  "public.example": [{ address: "93.184.216.34", family: 4 }],
  "dual.example": [
    { address: "93.184.216.34", family: 4 },
    { address: "10.0.0.5", family: 4 },
  ],
  "loop.example": [{ address: "127.0.0.1", family: 4 }],
  "six.example": [{ address: "fd12::1", family: 6 }],
};
const fakeLookup = async (hostname: string) => {
  const entries = lookupTable[hostname];
  if (!entries) {
    throw new Error("ENOTFOUND");
  }
  return entries;
};

describe("assertPublicHttpsTarget", () => {
  it("accepts a hostname whose addresses are all public", async () => {
    const url = await assertPublicHttpsTarget(
      "https://public.example/x",
      fakeLookup,
    );
    expect(url.href).toBe("https://public.example/x");
  });

  it.each([
    ["https://dual.example/", "private or loopback"],
    ["https://loop.example/", "private or loopback"],
    ["https://six.example/", "private or loopback"],
    ["https://missing.example/", "could not be resolved"],
    ["http://public.example/", "Only https"],
  ])("rejects %s", async (input, reason) => {
    await expect(assertPublicHttpsTarget(input, fakeLookup)).rejects.toThrow(
      reason,
    );
  });
});

describe("createRequestPolicy", () => {
  it("applies the target rule to every request and caches per host", async () => {
    let calls = 0;
    const policy = createRequestPolicy(async (hostname) => {
      calls += 1;
      return fakeLookup(hostname);
    });
    expect(await policy("https://public.example/page")).toBe(true);
    expect(await policy("https://public.example/asset.js")).toBe(true);
    expect(await policy("https://loop.example/redirect-target")).toBe(false);
    expect(await policy("http://public.example/insecure")).toBe(false);
    expect(await policy("https://127.0.0.1/")).toBe(false);
    expect(await policy("not a url")).toBe(false);
    expect(calls).toBe(2);
  });
});
