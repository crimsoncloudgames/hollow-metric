import posthog from "posthog-js";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const hostname = typeof window === "undefined" ? "" : window.location.hostname;
const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

if (posthogToken && apiHost) {
  try {
    posthog.init(posthogToken, {
      api_host: apiHost,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: isLocalhost,
      person_profiles: "identified_only",
      defaults: "2026-01-30",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("PostHog initialization failed.", error);
    }
  }
}