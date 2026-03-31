import { COOKIE_NAMES, readConsentFromCookieMap } from "@/lib/cookie-consent";
import { getCookieValue } from "@/lib/client-cookies";

export function hasFunctionalCookieConsent() {
  const consentRaw = getCookieValue(COOKIE_NAMES.consent);
  if (!consentRaw) return false;

  const consent = readConsentFromCookieMap({ [COOKIE_NAMES.consent]: consentRaw });
  return consent.functional || consent.personalization;
}
