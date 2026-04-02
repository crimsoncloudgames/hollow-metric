"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COOKIE_NAMES, DEFAULT_CONSENT, encodeConsentCookie, readConsentFromCookieMap } from "@/lib/cookie-consent";
import { getCookieValue, setCookieValue } from "@/lib/client-cookies";

const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const CONSENT_DISMISSED_KEY = "hm_cookie_banner_dismissed";

function getConsentCookieMap(): Record<string, string> {
  const consentValue = getCookieValue(COOKIE_NAMES.consent);
  if (!consentValue) return {};
  return { [COOKIE_NAMES.consent]: consentValue };
}

export default function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [personalization, setPersonalization] = useState(false);

  useEffect(() => {
    let hasDismissedFallback = false;

    if (typeof window !== "undefined") {
      try {
        hasDismissedFallback = window.localStorage.getItem(CONSENT_DISMISSED_KEY) === "1";
      } catch {
        hasDismissedFallback = false;
      }
    }

    const hasConsentCookie = Boolean(getCookieValue(COOKIE_NAMES.consent));
    setIsOpen(!(hasConsentCookie || hasDismissedFallback));
    setIsReady(true);
  }, []);

  const existingConsent = useMemo(() => {
    return readConsentFromCookieMap(getConsentCookieMap());
  }, []);

  if (!isReady || !isOpen) return null;

  const closeBanner = () => {
    setIsCustomizing(false);
    setIsOpen(false);
  };

  const saveConsent = (next: { functional: boolean; analytics: boolean; personalization: boolean }) => {
    try {
      setCookieValue(
        COOKIE_NAMES.consent,
        encodeConsentCookie({
          functional: next.functional,
          analytics: next.analytics,
          personalization: next.personalization,
          version: existingConsent.version || DEFAULT_CONSENT.version,
        }),
        CONSENT_MAX_AGE_SECONDS
      );
    } finally {
      if (typeof window !== "undefined") {
        try {
          // Fallback so banner can still be dismissed if cookie write is blocked by browser settings.
          window.localStorage.setItem(CONSENT_DISMISSED_KEY, "1");
        } catch {
          // Ignore storage failures (e.g. restricted browser contexts).
        }
      }

      // Always close the banner even if persistence is blocked.
      closeBanner();
    }
  };

  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 right-4 z-[1000] mx-auto max-w-4xl rounded-3xl border border-slate-700 bg-slate-950/95 p-4 text-slate-200 shadow-2xl backdrop-blur-xl sm:p-5">
      <p className="text-sm font-semibold text-white">Cookie Preferences</p>
      <p className="mt-2 text-xs leading-6 text-slate-400 sm:text-sm">
        We use essential cookies to run the tool, plus optional cookies for analytics, preferences, and personalized experience.
        See our <Link href="/privacy" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">Privacy Policy</Link>.
      </p>

      {isCustomizing && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span>Functional cookies (remember settings)</span>
            <input type="checkbox" checked={functional} onChange={(e) => setFunctional(e.target.checked)} className="h-4 w-4" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Analytics cookies</span>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="h-4 w-4" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Personalization cookies</span>
            <input type="checkbox" checked={personalization} onChange={(e) => setPersonalization(e.target.checked)} className="h-4 w-4" />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => saveConsent({ functional: false, analytics: false, personalization: false })}
          className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
        >
          Reject Optional
        </button>
        <button
          type="button"
          onClick={() => setIsCustomizing((value) => !value)}
          className="rounded-2xl border border-blue-600/50 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:border-blue-400 hover:text-blue-200"
        >
          {isCustomizing ? "Hide Customize" : "Customize"}
        </button>
        {isCustomizing && (
          <button
            type="button"
            onClick={() => saveConsent({ functional, analytics, personalization })}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            Save Preferences
          </button>
        )}
        <button
          type="button"
          onClick={() => saveConsent({ functional: true, analytics: true, personalization: true })}
          className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500 sm:ml-auto"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
