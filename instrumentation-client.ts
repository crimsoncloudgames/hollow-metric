import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (projectToken && apiHost) {
  try {
    posthog.init(projectToken, {
      api_host: apiHost,
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
      defaults: "2026-01-30",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("PostHog initialization failed.", error);
    }
  }
}