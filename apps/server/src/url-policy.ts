import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const blockedHostnames = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map((part) => Number.parseInt(part, 10));
  const [a = 0, b = 0] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") {
    return true;
  }
  if (normalized.startsWith("::ffff:")) {
    return true;
  }
  return /^(?:fc|fd|fe[89ab]|ff)/u.test(normalized);
}

export function assertPublicHttpsUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("The URL is not valid");
  }
  if (url.protocol !== "https:") {
    throw new Error("Only https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with user information are not allowed");
  }
  if (url.port && url.port !== "443") {
    throw new Error("Only the default https port is allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Local hostnames are not allowed");
  }
  const ipVersion = isIP(hostname);
  if (
    (ipVersion === 4 && isPrivateIpv4(hostname)) ||
    (ipVersion === 6 && isPrivateIpv6(hostname))
  ) {
    throw new Error("Private or loopback addresses are not allowed");
  }
  if (!hostname.includes(".") && ipVersion === 0) {
    throw new Error("The hostname must be publicly resolvable");
  }

  return url;
}

export type AddressLookup = (
  hostname: string,
) => Promise<readonly { readonly address: string; readonly family: number }[]>;

const defaultLookup: AddressLookup = (hostname) =>
  dnsLookup(hostname, { all: true, verbatim: true });

function isPrivateAddress(address: string, family: number): boolean {
  return family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address);
}

/** True for loopback, private, link-local, or otherwise non-public peers. */
export function isPrivatePeerAddress(address: string): boolean {
  const family = isIP(address);
  return family === 0 || isPrivateAddress(address, family);
}

/**
 * Syntactic policy plus DNS resolution: every address the hostname resolves
 * to must be public. Rejects hostnames that point at loopback or private
 * networks, which the literal check alone cannot see.
 */
export async function assertPublicHttpsTarget(
  input: string,
  lookup: AddressLookup = defaultLookup,
): Promise<URL> {
  const url = assertPublicHttpsUrl(input);
  const hostname = url.hostname.replace(/^\[|\]$/gu, "");
  if (isIP(hostname) !== 0) {
    return url;
  }
  let addresses: Awaited<ReturnType<AddressLookup>>;
  try {
    addresses = await lookup(hostname);
  } catch {
    throw new Error("The hostname could not be resolved");
  }
  if (addresses.length === 0) {
    throw new Error("The hostname could not be resolved");
  }
  for (const { address, family } of addresses) {
    if (isPrivateAddress(address, family)) {
      throw new Error("The hostname resolves to a private or loopback address");
    }
  }
  return url;
}

/**
 * Per-request guard for the browser session. It applies the same rule to the
 * navigation target, every redirect hop, and every subresource, and caches
 * the verdict per hostname for the lifetime of the guard.
 */
export function createRequestPolicy(
  lookup: AddressLookup = defaultLookup,
): (url: string) => Promise<boolean> {
  // The syntactic rule runs for every URL; only the DNS verdict is cached,
  // keyed by hostname, so an http or user-info variant of an approved host
  // is still rejected.
  const dnsVerdicts = new Map<string, Promise<boolean>>();
  return async (url) => {
    let parsed: URL;
    try {
      parsed = assertPublicHttpsUrl(url);
    } catch {
      return false;
    }
    let verdict = dnsVerdicts.get(parsed.hostname);
    if (!verdict) {
      verdict = assertPublicHttpsTarget(parsed.href, lookup).then(
        () => true,
        () => false,
      );
      dnsVerdicts.set(parsed.hostname, verdict);
    }
    return verdict;
  };
}
