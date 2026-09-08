export interface BrowserIdentity {
  readonly browserVersion: string;
  readonly userAgent: string;
  readonly platform: string;
  readonly vendor: string;
  readonly language: string;
  readonly languages: readonly string[];
  readonly webdriver: boolean;
  readonly brands: readonly string[];
  readonly mobile: boolean | null;
  readonly uaPlatform: string | null;
}

export interface BrowserSession {
  readonly navigate: (
    url: string,
    timeoutMs: number,
  ) => Promise<{ readonly httpStatus: number | null }>;
  readonly title: () => Promise<string>;
  readonly bodyText: () => Promise<string>;
  readonly identity: () => Promise<BrowserIdentity>;
  readonly finalUrl: () => string;
  /**
   * IP addresses the browser actually connected to for every response so
   * far. Lets a caller verify the real peers after DNS, independent of the
   * pre-navigation lookup.
   */
  readonly peerAddresses: () => Promise<readonly string[]>;
  readonly close: () => Promise<void>;
}

export type BrowserSessionFactory = () => Promise<BrowserSession>;

export interface RequestInfo {
  /** True for a top-level document request, including every redirect hop. */
  readonly isNavigation: boolean;
}

/**
 * Thrown by navigate when a top-level document request was refused by the
 * request policy, typically a cross-host redirect. The caller can validate
 * the location and follow it with a freshly pinned session.
 */
export class RedirectBlockedError extends Error {
  readonly location: string;

  constructor(location: string, options?: ErrorOptions) {
    super(`Navigation to ${location} was refused by the URL policy`, options);
    this.name = "RedirectBlockedError";
    this.location = location;
  }
}

export interface BrowserSessionOptions {
  readonly executablePath?: string;
  /**
   * Decides for every request the page makes, including redirect targets and
   * subresources, whether the browser may send it. A rejected request is
   * aborted. Interception is only installed when the hook is present.
   */
  readonly allowRequest?: (
    url: string,
    request: RequestInfo,
  ) => boolean | Promise<boolean>;
  /**
   * Chromium --host-resolver-rules entries, for example
   * "MAP example.com 93.184.216.34". Pins a pre-validated hostname to the
   * address that passed the policy, so Chromium's own DNS lookup cannot be
   * rebound to another address.
   */
  readonly hostResolverRules?: readonly string[];
  /**
   * Enables Chromium's Local Network Access checks. Subresource requests
   * from a public page to loopback, private, or link-local addresses are
   * then blocked by the browser at connection time, independent of DNS.
   */
  readonly blockLocalNetworkAccess?: boolean;
}

export interface BrowserDescription {
  readonly executablePath: string;
  readonly chromiumVersion: string;
}
