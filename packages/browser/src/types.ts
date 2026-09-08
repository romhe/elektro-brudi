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

export interface BrowserSessionOptions {
  readonly executablePath?: string;
  /**
   * Decides for every request the page makes, including redirect targets and
   * subresources, whether the browser may send it. A rejected request is
   * aborted. Interception is only installed when the hook is present.
   */
  readonly allowRequest?: (url: string) => boolean | Promise<boolean>;
}

export interface BrowserDescription {
  readonly executablePath: string;
  readonly chromiumVersion: string;
}
