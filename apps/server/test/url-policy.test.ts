import { describe, expect, it } from "vitest";
import { assertPublicHttpsUrl } from "../src/url-policy.js";

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
