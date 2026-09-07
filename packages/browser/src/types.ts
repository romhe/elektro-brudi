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
  readonly close: () => Promise<void>;
}

export type BrowserSessionFactory = () => Promise<BrowserSession>;

export interface BrowserDescription {
  readonly executablePath: string;
  readonly chromiumVersion: string;
}
