"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type DebugValue = string | number | boolean | null | undefined;

type InternalDebugPanelProps = {
  pageName: string;
  items: Array<{
    label: string;
    value: DebugValue;
  }>;
  auth?: {
    sessionExists?: boolean | null;
    userId?: string | null;
    userEmail?: string | null;
  };
};

type AuthDebugState = {
  sessionExists: string;
  userId: string;
  userEmail: string;
};

function normalizeDebugValue(value: DebugValue): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : "unavailable";
  }

  if (typeof value === "string") {
    return value.trim() ? value : "unavailable";
  }

  return "unavailable";
}

function normalizeSessionValue(value: boolean | null | undefined): string {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "unknown";
}

function normalizeOptionalString(value: string | null | undefined): string {
  return typeof value === "string" && value.trim() ? value : "unavailable";
}

export function InternalDebugPanel({ pageName, items, auth }: InternalDebugPanelProps) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_DEBUG_EMAIL?.trim().toLowerCase() ?? "";
  const [isVisible, setIsVisible] = useState(isDevelopment);
  const [visibilityReason, setVisibilityReason] = useState<string>(
    isDevelopment ? "development" : "unknown"
  );
  const [authDebug, setAuthDebug] = useState<AuthDebugState>({
    sessionExists: normalizeSessionValue(auth?.sessionExists),
    userId: normalizeOptionalString(auth?.userId),
    userEmail: normalizeOptionalString(auth?.userEmail),
  });

  useEffect(() => {
    let mounted = true;

    const providedEmail =
      typeof auth?.userEmail === "string" && auth.userEmail.trim()
        ? auth.userEmail.trim()
        : null;
    const providedUserId =
      typeof auth?.userId === "string" && auth.userId.trim() ? auth.userId.trim() : null;

    const applyResolvedState = (
      sessionExists: boolean | null | undefined,
      userId: string | null | undefined,
      userEmail: string | null | undefined,
      reasonOverride?: string
    ) => {
      if (!mounted) {
        return;
      }

      setAuthDebug({
        sessionExists: normalizeSessionValue(sessionExists),
        userId: normalizeOptionalString(userId),
        userEmail: normalizeOptionalString(userEmail),
      });

      if (reasonOverride) {
        setVisibilityReason(reasonOverride);
      }
    };

    const resolveVisibility = (userEmail: string | null | undefined) => {
      if (isDevelopment) {
        if (mounted) {
          setIsVisible(true);
          setVisibilityReason("development");
        }

        return true;
      }

      if (!adminEmail) {
        if (mounted) {
          setIsVisible(false);
        }

        return false;
      }

      const isAdmin = Boolean(userEmail && userEmail.trim().toLowerCase() === adminEmail);

      if (mounted) {
        setIsVisible(isAdmin);

        if (isAdmin) {
          setVisibilityReason("admin email match");
        }
      }

      return isAdmin;
    };

    const hasProvidedAuth =
      auth?.sessionExists !== undefined || providedEmail !== null || providedUserId !== null;

    if (hasProvidedAuth) {
      const shouldShowFromProvidedAuth = resolveVisibility(providedEmail);

      if (shouldShowFromProvidedAuth) {
        applyResolvedState(auth?.sessionExists, providedUserId, providedEmail);
      }
    }

    if (!isDevelopment && !adminEmail) {
      return () => {
        mounted = false;
      };
    }

    const supabase = createClient();
    if (!supabase) {
      if (isDevelopment || resolveVisibility(providedEmail)) {
        applyResolvedState(auth?.sessionExists, providedUserId, providedEmail);
      }

      return () => {
        mounted = false;
      };
    }

    const loadAuth = async () => {
      try {
        const [sessionResult, userResult] = await Promise.all([
          supabase.auth.getSession(),
          supabase.auth.getUser(),
        ]);

        if (!mounted) {
          return;
        }

        const resolvedSessionExists = sessionResult.error
          ? auth?.sessionExists ?? null
          : Boolean(sessionResult.data.session);
        const resolvedUserId = userResult.error
          ? providedUserId
          : userResult.data.user?.id ?? providedUserId;
        const resolvedUserEmail = userResult.error
          ? providedEmail
          : userResult.data.user?.email ?? providedEmail;
        const shouldShow = resolveVisibility(resolvedUserEmail);

        if (shouldShow) {
          applyResolvedState(
            resolvedSessionExists,
            resolvedUserId,
            resolvedUserEmail,
            isDevelopment ? "development" : "admin email match"
          );
        }
      } catch {
        if (!mounted) {
          return;
        }

        const shouldShow = resolveVisibility(providedEmail);

        if (shouldShow) {
          applyResolvedState(auth?.sessionExists, providedUserId, providedEmail);
        }
      }
    };

    void loadAuth();

    return () => {
      mounted = false;
    };
  }, [adminEmail, auth?.sessionExists, auth?.userEmail, auth?.userId, isDevelopment]);

  if (!isVisible) {
    return null;
  }

  const rows = [
    { label: "page", value: pageName },
    { label: "visibility", value: visibilityReason },
    { label: "session exists", value: authDebug.sessionExists },
    { label: "user email", value: authDebug.userEmail },
    { label: "user id", value: authDebug.userId },
    ...items,
  ];

  return (
    <details className="rounded-2xl border border-amber-600/30 bg-amber-600/10 p-4 text-sm text-amber-100">
      <summary className="cursor-pointer list-none font-semibold">
        Internal Debug Only
      </summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={`${pageName}-${row.label}`} className="rounded-xl border border-amber-600/20 bg-slate-950/40 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-amber-200/70">
              {row.label}
            </p>
            <p className="mt-1 break-all text-sm text-amber-50">
              {normalizeDebugValue(row.value)}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}