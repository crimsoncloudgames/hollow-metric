export const COOKIE_NAMES = {
  consent: "hm_cookie_consent",
  authState: "hm_auth_state",
  previewLimit: "hm_free_preview_used",
  blurState: "hm_blur_state",
  lastAnalysis: "hm_last_analysis",
  usage: "hm_analysis_usage",
  recentAppIds: "hm_recent_app_ids",
  analysisPrefs: "hm_analysis_prefs",
  landingAccess: "hm_landing_access",
} as const;

export type CookieConsent = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  personalization: boolean;
  version: number;
  updatedAt: string;
};

export const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  functional: false,
  analytics: false,
  personalization: false,
  version: 1,
  updatedAt: "",
};

export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const splitIndex = entry.indexOf("=");
      if (splitIndex < 0) return acc;
      const key = entry.slice(0, splitIndex).trim();
      const value = entry.slice(splitIndex + 1).trim();
      if (!key) return acc;

      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
}

export function readConsentFromCookieMap(cookieMap: Record<string, string>): CookieConsent {
  const raw = cookieMap[COOKIE_NAMES.consent];
  if (!raw) {
    return DEFAULT_CONSENT;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    return {
      necessary: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      personalization: Boolean(parsed.personalization),
      version: Number(parsed.version) || 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function encodeConsentCookie(consent: {
  functional: boolean;
  analytics: boolean;
  personalization: boolean;
  version?: number;
}) {
  return JSON.stringify({
    necessary: true,
    functional: Boolean(consent.functional),
    analytics: Boolean(consent.analytics),
    personalization: Boolean(consent.personalization),
    version: consent.version ?? 1,
    updatedAt: new Date().toISOString(),
  } satisfies CookieConsent);
}

export function sanitizeAppIdList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((value): value is string => typeof value === "string")
    .filter((value) => /^\d+$/.test(value))
    .slice(0, 20);
}
