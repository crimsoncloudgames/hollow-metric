"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InternalDebugPanel } from "@/components/internal-debug-panel";
import { openPaddleCheckout } from "@/lib/paddle";
import { createClient } from "@/utils/supabase/client";
import {
  FINANCIAL_PROJECTS_STORAGE_KEY,
  FINANCIAL_PROJECTS_UPDATED_EVENT,
  type FinancialProject,
  getSavedFinancialProjects,
} from "@/lib/financial-projects";

type SubscriptionTier = "starter" | "launch-planner";

type PlanningDefaults = {
  withholdingTax: number;
  refundsAssumption: number;
};

type ActionFeedback = {
  tone: "success" | "error";
  message: string;
};

type BillingCheckoutConfigResponse = {
  priceId?: string;
  planKey?: string;
  userId?: string;
  email?: string | null;
  error?: string;
};

type DeleteAccountResponse = {
  success?: boolean;
  error?: string;
};

const DEFAULTS_STORAGE_KEY = "hm_planning_defaults";
const LAUNCH_BUDGET_DRAFT_STORAGE_KEY = "hm_launch_budget_draft";
const ACTIVE_PROJECT_STORAGE_KEY = "hm_active_project";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLAN_LABELS: Record<SubscriptionTier, string> = {
  starter: "Starter",
  "launch-planner": "Launch Planner",
};

const PLAN_LIMIT_SUMMARY: Record<SubscriptionTier, string> = {
  starter: "Launch Planner: not unlocked on Starter",
  "launch-planner": "Launch Planner: 1 active project",
};

const DEFAULT_PLANNING_DEFAULTS: PlanningDefaults = {
  withholdingTax: 30,
  refundsAssumption: 8,
};

function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, value));
}

function getFriendlySettingsError(error: unknown, fallbackMessage: string): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("network") || message.includes("fetch")) {
    return `${fallbackMessage} Check your connection and try again.`;
  }

  return fallbackMessage;
}

function getFriendlyAccountError(message: string, action: "email" | "password" | "sign-out"): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (normalizedMessage.includes("session") || normalizedMessage.includes("not authenticated")) {
    return "Please sign in again and try once more.";
  }

  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    if (action === "sign-out") {
      return "We couldn't sign out your other sessions right now. Please check your connection and try again.";
    }

    return "We couldn't update your account right now. Please check your connection and try again.";
  }

  if (action === "email") {
    if (normalizedMessage.includes("email") && normalizedMessage.includes("invalid")) {
      return "Enter a valid email address.";
    }

    if (normalizedMessage.includes("already") && normalizedMessage.includes("email")) {
      return "That email address is already in use.";
    }
  }

  if (action === "password") {
    if (normalizedMessage.includes("password") && normalizedMessage.includes("same")) {
      return "Choose a different password before saving.";
    }

    if (normalizedMessage.includes("password") && normalizedMessage.includes("8")) {
      return "Password must be at least 8 characters.";
    }
  }

  if (action === "sign-out" && normalizedMessage.includes("not authenticated")) {
    return "You're already signed out.";
  }

  return message.trim() || "We couldn't complete that action right now.";
}

function getFriendlyDeleteAccountError(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("unauthorized") || normalizedMessage.includes("session")) {
    return "Please sign in again before deleting your account.";
  }

  if (normalizedMessage.includes("subscription") && normalizedMessage.includes("cancel")) {
    return message.trim();
  }

  if (normalizedMessage.includes("confirm")) {
    return "Please confirm account deletion before continuing.";
  }

  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return "We couldn't reach account services right now. Check your connection and try again.";
  }

  return message.trim() || "We couldn't delete your account right now.";
}

function formatBillingStatusLabel(status: string | null | undefined, fallback = "Unknown"): string {
  if (typeof status !== "string" || status.trim().length === 0) {
    return fallback;
  }

  const normalized = status.trim().replace(/_/g, " ");
  return normalized[0].toUpperCase() + normalized.slice(1);
}

function getDisplayedBillingStatus({
  entitlementBillingState,
  subscriptionStatus,
  cancelAtPeriodEnd,
}: {
  entitlementBillingState: string;
  subscriptionStatus: string | null | undefined;
  cancelAtPeriodEnd: boolean;
}) {
  const normalizedSubscriptionStatus =
    typeof subscriptionStatus === "string" ? subscriptionStatus.trim().toLowerCase() : "";

  if (normalizedSubscriptionStatus === "canceled" || normalizedSubscriptionStatus === "ended") {
    return "Canceled";
  }

  if (cancelAtPeriodEnd) {
    return "Cancels At Period End";
  }

  if (normalizedSubscriptionStatus.length > 0 && normalizedSubscriptionStatus !== "unknown") {
    return formatBillingStatusLabel(normalizedSubscriptionStatus);
  }

  return formatBillingStatusLabel(entitlementBillingState, "Unknown");
}

export default function SettingsPage() {
  const router = useRouter();
  const [signedInEmail, setSignedInEmail] = useState("Loading...");
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
  const [billingStatus, setBillingStatus] = useState("Loading...");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [subscriptionActionState, setSubscriptionActionState] = useState<ActionFeedback | null>(null);
  const [isLaunchingUpgradeCheckout, setIsLaunchingUpgradeCheckout] = useState(false);
  const [projects, setProjects] = useState<FinancialProject[]>([]);
  const [isLoadingUserContext, setIsLoadingUserContext] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [localDataNotice, setLocalDataNotice] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<PlanningDefaults>(DEFAULT_PLANNING_DEFAULTS);
  const [defaultsSavedState, setDefaultsSavedState] = useState<ActionFeedback | null>(null);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountActionState, setAccountActionState] = useState<ActionFeedback | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [exportActionState, setExportActionState] = useState<ActionFeedback | null>(null);
  const [isExportingData, setIsExportingData] = useState(false);
  const [privacyActionState, setPrivacyActionState] = useState<ActionFeedback | null>(null);
  const [isSigningOutAllSessions, setIsSigningOutAllSessions] = useState(false);
  const [deleteAccountActionState, setDeleteAccountActionState] = useState<ActionFeedback | null>(null);
  const [isDeleteAccountConfirmOpen, setIsDeleteAccountConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUserContext = async () => {
      setContextError(null);
      setIsLoadingUserContext(true);

      try {
        const supabase = createClient();
        if (!supabase) {
          if (mounted) {
            setSignedInEmail("Not available");
            setBillingStatus("Unavailable");
            setContextError(
              "We couldn't connect to account services right now. Settings are available in limited mode."
            );
          }
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (userError) {
          console.error("Failed to load current user for settings page", userError);
          setSignedInEmail("Not available");
          setBillingStatus("Unavailable");
          setContextError(
            getFriendlySettingsError(
              userError,
              "We couldn't load your account details right now."
            )
          );
          return;
        }

        if (!user) {
          setSignedInEmail("Not signed in");
          setBillingStatus("Not signed in");
          return;
        }

        setSignedInEmail(user.email ?? "Email unavailable");

        const { data: entitlement, error: entitlementError } = await supabase
          .from("user_entitlements")
          .select("tier, billing_state, active_subscription_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (entitlementError) {
          console.error("Failed to load live billing state for settings page", entitlementError);
          setSubscriptionTier("starter");
          setBillingStatus("Unavailable");
          setContextError(
            getFriendlySettingsError(
              entitlementError,
              "We couldn't load your billing details right now."
            )
          );
          return;
        }

        if (!entitlement) {
          setSubscriptionTier("starter");
          setBillingStatus("No billing record");
          setRenewalDate(null);
          return;
        }

        setSubscriptionTier(entitlement.tier === "pro" ? "launch-planner" : "starter");

        const liveBillingState =
          typeof entitlement.billing_state === "string" ? entitlement.billing_state.trim() : "";

        setBillingStatus(formatBillingStatusLabel(liveBillingState, "Unknown"));

        if (typeof entitlement.active_subscription_id !== "number") {
          setRenewalDate(null);
          return;
        }

        const { data: subscription, error: subscriptionError } = await supabase
          .from("billing_subscriptions")
          .select("current_period_end, cancel_at_period_end, status_normalized")
          .eq("id", entitlement.active_subscription_id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (subscriptionError) {
          console.error("Failed to load renewal date for settings page", subscriptionError);
          setRenewalDate(null);
          setContextError(
            getFriendlySettingsError(
              subscriptionError,
              "We couldn't load your renewal date right now."
            )
          );
          return;
        }

        setBillingStatus(
          getDisplayedBillingStatus({
            entitlementBillingState: liveBillingState,
            subscriptionStatus:
              typeof subscription?.status_normalized === "string"
                ? subscription.status_normalized
                : null,
            cancelAtPeriodEnd: subscription?.cancel_at_period_end === true,
          })
        );
        setRenewalDate(subscription?.current_period_end ?? null);
      } catch (error) {
        console.error("Failed to load settings context", error);

        if (!mounted) {
          return;
        }

        setSignedInEmail("Not available");
        setBillingStatus("Unavailable");
        setSubscriptionTier("starter");
        setRenewalDate(null);
        setContextError(
          getFriendlySettingsError(error, "We couldn't load your settings right now.")
        );
      } finally {
        if (mounted) {
          setIsLoadingUserContext(false);
        }
      }
    };

    void loadUserContext();

    try {
      const savedProjects = getSavedFinancialProjects();

      if (!Array.isArray(savedProjects)) {
        throw new Error("invalid saved project data");
      }

      setProjects(savedProjects);
    } catch (error) {
      console.error("Failed to load local project data for settings page", error);
      setProjects([]);
      setLocalDataNotice(
        getFriendlySettingsError(
          error,
          "Some local planning data could not be loaded."
        )
      );
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedDefaultsRaw = window.localStorage.getItem(DEFAULTS_STORAGE_KEY);
      if (storedDefaultsRaw) {
        const parsed = JSON.parse(storedDefaultsRaw) as Partial<PlanningDefaults>;
        const nextWithholdingTax = clampPercent(Number(parsed.withholdingTax), DEFAULT_PLANNING_DEFAULTS.withholdingTax);
        const nextRefundsAssumption = clampPercent(Number(parsed.refundsAssumption), DEFAULT_PLANNING_DEFAULTS.refundsAssumption);

        setDefaults({
          withholdingTax: nextWithholdingTax,
          refundsAssumption: nextRefundsAssumption,
        });
      }
    } catch {
      setDefaults(DEFAULT_PLANNING_DEFAULTS);
      setLocalDataNotice((current) =>
        current ?? "Saved planning defaults on this device were invalid, so built-in defaults were restored."
      );
    }
  }, []);

  const maxProjects = useMemo(() => {
    if (subscriptionTier === "starter") return 0;
    return 1;
  }, [subscriptionTier]);

  const formattedRenewalDate = useMemo(() => {
    if (!renewalDate) {
      return null;
    }

    const parsedDate = new Date(renewalDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return renewalDate;
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsedDate);
  }, [renewalDate]);

  const subscriptionDateLabel = useMemo(() => {
    const normalizedBillingStatus = billingStatus.trim().toLowerCase();

    if (normalizedBillingStatus === "cancels at period end") {
      return "Access until";
    }

    if (normalizedBillingStatus === "canceled") {
      return "Ended on";
    }

    return "Renewal date";
  }, [billingStatus]);

  const activeProjectsCount = maxProjects === Infinity ? projects.length : Math.min(projects.length, maxProjects);
  const savedProjectsCount = projects.length;
  const isAccountActionPending = isUpdatingEmail || isUpdatingPassword;
  const settingsContextState = isLoadingUserContext ? "loading" : contextError ? "fallback" : "live";
  const defaultsActionState = isSavingDefaults ? "saving" : defaultsSavedState?.tone ?? "idle";
  const accountDebugState = isAccountActionPending ? "updating" : accountActionState?.tone ?? "idle";
  const exportDebugState = isExportingData ? "exporting" : exportActionState?.tone ?? "idle";
  const privacyDebugState = isSigningOutAllSessions ? "signing-out" : privacyActionState?.tone ?? "idle";
  const deleteAccountDebugState = isDeletingAccount
    ? "deleting"
    : isDeleteAccountConfirmOpen
      ? "confirming"
      : deleteAccountActionState?.tone ?? "idle";
  const subscriptionDebugState = isLaunchingUpgradeCheckout
    ? "checkout"
    : subscriptionActionState?.tone ?? "idle";
  const settingsDebugAuth = useMemo(
    () => ({
      sessionExists: isLoadingUserContext
        ? null
        : signedInEmail === "Not signed in"
          ? false
          : signedInEmail.includes("@")
            ? true
            : null,
      userEmail: signedInEmail.includes("@") ? signedInEmail : null,
    }),
    [isLoadingUserContext, signedInEmail]
  );

  const onSaveDefaults = () => {
    if (typeof window === "undefined" || isSavingDefaults) return;

    setDefaultsSavedState(null);
    setIsSavingDefaults(true);

    try {
      window.localStorage.setItem(DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
      setDefaultsSavedState({
        tone: "success",
        message: "Planning defaults saved on this device.",
      });
    } catch {
      setDefaultsSavedState({
        tone: "error",
        message: "We couldn't save planning defaults on this device right now.",
      });
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const onChangeEmail = async () => {
    if (isUpdatingEmail || isLoadingUserContext) {
      return;
    }

    setAccountActionState(null);

    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setAccountActionState({ tone: "error", message: "Enter a valid email address." });
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setAccountActionState({
        tone: "error",
        message: "We couldn't connect to account services right now.",
      });
      return;
    }

    setIsUpdatingEmail(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setAccountActionState({
          tone: "error",
          message: getFriendlySettingsError(userError, "We couldn't verify your account right now."),
        });
        return;
      }

      if (!user) {
        setAccountActionState({ tone: "error", message: "You must be signed in to change email." });
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (error) {
        setAccountActionState({
          tone: "error",
          message: getFriendlyAccountError(error.message ?? "", "email"),
        });
        return;
      }

      setAccountActionState({
        tone: "success",
        message: "Email update submitted. Check your inbox to confirm if required.",
      });
      setNewEmail("");
    } catch (error) {
      setAccountActionState({
        tone: "error",
        message: getFriendlySettingsError(error, "We couldn't update your email right now."),
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const onChangePassword = async () => {
    if (isUpdatingPassword || isLoadingUserContext) {
      return;
    }

    setAccountActionState(null);

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 8) {
      setAccountActionState({ tone: "error", message: "Password must be at least 8 characters." });
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setAccountActionState({
        tone: "error",
        message: "We couldn't connect to account services right now.",
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setAccountActionState({
          tone: "error",
          message: getFriendlySettingsError(userError, "We couldn't verify your account right now."),
        });
        return;
      }

      if (!user) {
        setAccountActionState({ tone: "error", message: "You must be signed in to change password." });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
      if (error) {
        setAccountActionState({
          tone: "error",
          message: getFriendlyAccountError(error.message ?? "", "password"),
        });
        return;
      }

      setAccountActionState({ tone: "success", message: "Password updated." });
      setNewPassword("");
    } catch (error) {
      setAccountActionState({
        tone: "error",
        message: getFriendlySettingsError(error, "We couldn't update your password right now."),
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const onExportMyData = () => {
    if (typeof window === "undefined" || isExportingData) return;

    setExportActionState(null);
    setIsExportingData(true);

    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        account: {
          email: signedInEmail,
          plan: PLAN_LABELS[subscriptionTier],
        },
        planningDefaults: defaults,
        financialProjects: projects,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `hollowmetric-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setExportActionState({ tone: "success", message: "Exported local planning data as JSON." });
    } catch (error) {
      setExportActionState({
        tone: "error",
        message: getFriendlySettingsError(error, "We couldn't export your data right now."),
      });
    } finally {
      setIsExportingData(false);
    }
  };

  const onUpgradeToPro = async () => {
    if (isLaunchingUpgradeCheckout || isLoadingUserContext) {
      return;
    }

    setSubscriptionActionState(null);
    setIsLaunchingUpgradeCheckout(true);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
      });

      const result = (await response.json().catch(() => null)) as BillingCheckoutConfigResponse | null;

      if (!response.ok || !result?.priceId || !result?.userId) {
        setSubscriptionActionState({
          tone: "error",
          message: result?.error?.trim() || "We couldn't start Pro checkout right now. Please try again.",
        });
        return;
      }

      await openPaddleCheckout(result.priceId, {
        userId: result.userId,
        email: result.email ?? undefined,
        planKey: result.planKey ?? "pro",
      });
    } catch (error) {
      setSubscriptionActionState({
        tone: "error",
        message: getFriendlySettingsError(error, "We couldn't start Pro checkout right now."),
      });
    } finally {
      setIsLaunchingUpgradeCheckout(false);
    }
  };

  const onSignOutAllSessions = async () => {
    if (isSigningOutAllSessions || isLoadingUserContext) {
      return;
    }

    setPrivacyActionState(null);

    const supabase = createClient();
    if (!supabase) {
      setPrivacyActionState({
        tone: "error",
        message: "We couldn't connect to account services right now.",
      });
      return;
    }

    setIsSigningOutAllSessions(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });

      if (error) {
        setPrivacyActionState({
          tone: "error",
          message: getFriendlyAccountError(error.message ?? "", "sign-out"),
        });
        return;
      }

      setPrivacyActionState({ tone: "success", message: "Signed out of all sessions." });
    } catch (error) {
      setPrivacyActionState({
        tone: "error",
        message: getFriendlySettingsError(error, "We couldn't sign out all sessions right now."),
      });
    } finally {
      setIsSigningOutAllSessions(false);
    }
  };

  const clearDeletedAccountLocalData = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(DEFAULTS_STORAGE_KEY);
    window.localStorage.removeItem(LAUNCH_BUDGET_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(FINANCIAL_PROJECTS_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
    window.dispatchEvent(new Event(FINANCIAL_PROJECTS_UPDATED_EVENT));
  };

  const onDeleteAccount = async () => {
    if (isLoadingUserContext || isDeletingAccount) {
      return;
    }

    setDeleteAccountActionState(null);
    setIsDeletingAccount(true);

    try {
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm: true }),
      });

      const result = (await response.json().catch(() => null)) as DeleteAccountResponse | null;

      if (!response.ok || !result?.success) {
        setDeleteAccountActionState({
          tone: "error",
          message: getFriendlyDeleteAccountError(
            result?.error?.trim() || `Request failed with status ${response.status}.`
          ),
        });
        return;
      }

      clearDeletedAccountLocalData();
      setProjects([]);
      setSignedInEmail("Not signed in");
      setDeleteAccountActionState({
        tone: "success",
        message: "Your account has been deleted. Redirecting to login...",
      });

      const supabase = createClient();

      if (supabase) {
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Failed to clear deleted account session in browser", error);
        }
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setDeleteAccountActionState({
        tone: "error",
        message: getFriendlySettingsError(error, "We couldn't delete your account right now."),
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Account</p>
            {contextError && (
              <p className="mt-3 text-xs text-amber-300" role="alert">
                {contextError}
              </p>
            )}
            {localDataNotice && (
              <p className="mt-3 text-xs text-amber-300" role="status">
                {localDataNotice}
              </p>
            )}
            <p className="mt-4 text-sm text-slate-400">Signed in email</p>
            <p className="text-lg font-semibold text-white">{signedInEmail}</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-400">New email</span>
              <input
                type="email"
                value={newEmail}
                onChange={(event) => {
                  setNewEmail(event.target.value);
                  setAccountActionState(null);
                }}
                placeholder="name@example.com"
                disabled={isLoadingUserContext || isAccountActionPending}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void onChangeEmail()}
              disabled={isLoadingUserContext || isAccountActionPending}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
            >
              {isUpdatingEmail ? "Updating Email..." : "Change Email"}
            </button>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-400">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setAccountActionState(null);
                }}
                placeholder="At least 8 characters"
                disabled={isLoadingUserContext || isAccountActionPending}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void onChangePassword()}
              disabled={isLoadingUserContext || isAccountActionPending}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
            >
              {isUpdatingPassword ? "Updating Password..." : "Change Password"}
            </button>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-500">
          Email and password updates are available now for signed-in users.
        </p>
        {accountActionState && (
          <p
            className={[
              "mt-3 text-xs",
              accountActionState.tone === "error" ? "text-amber-300" : "text-emerald-300",
            ].join(" ")}
            role={accountActionState.tone === "error" ? "alert" : "status"}
          >
            {accountActionState.message}
          </p>
        )}
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Subscription</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-slate-400">Current plan: <span className="font-semibold text-white">{PLAN_LABELS[subscriptionTier]}</span></p>
              <p className="text-slate-400">Billing status: <span className="font-semibold text-white">{billingStatus}</span></p>
              <p className="text-slate-400">{subscriptionDateLabel}: <span className="font-semibold text-white">{formattedRenewalDate ?? "—"}</span></p>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-2">
            {subscriptionTier === "starter" ? (
              <button
                type="button"
                onClick={() => {
                  void onUpgradeToPro();
                }}
                disabled={isLoadingUserContext || isLaunchingUpgradeCheckout}
                className="w-full rounded-xl border border-blue-600/40 bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-600/20 disabled:cursor-not-allowed disabled:border-blue-900/30 disabled:bg-blue-950/20 disabled:text-blue-300/70 disabled:opacity-80"
              >
                {isLaunchingUpgradeCheckout ? "Opening Checkout..." : "Upgrade to Pro"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full cursor-not-allowed rounded-xl border border-blue-900/30 bg-blue-950/20 px-4 py-2 text-sm font-semibold text-blue-400/70"
              >
                Manage Subscription
              </button>
            )}
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-500 opacity-70"
            >
              Downgrade Subscription
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-500 opacity-70"
            >
              Cancel Subscription
            </button>
            <p className="text-xs leading-6 text-slate-500">
              {subscriptionTier === "starter"
                ? "Upgrade opens secure Paddle checkout. In-app manage, downgrade, and cancel controls are still being wired up."
                : "Subscription state is synced from Paddle. In-app manage, downgrade, and cancel controls are still being wired up."}
            </p>
            {subscriptionActionState && (
              <p
                className={[
                  "text-xs",
                  subscriptionActionState.tone === "error" ? "text-amber-300" : "text-emerald-300",
                ].join(" ")}
                role={subscriptionActionState.tone === "error" ? "alert" : "status"}
              >
                {subscriptionActionState.message}
              </p>
            )}
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Planning Defaults</p>
        <p className="mt-2 text-xs text-slate-500">
          These defaults are used to prefill new launch budget projects.
        </p>
        <p className="mt-2 text-xs text-slate-500">Project-specific amounts are managed inside each project or calculator.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-400">Default U.S. withholding tax (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={defaults.withholdingTax}
              onChange={(event) => {
                const value = Number(event.target.value);
                setDefaults((prev) => ({
                  ...prev,
                  withholdingTax: Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0,
                }));
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-600/50 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-400">Default refunds / chargebacks (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={defaults.refundsAssumption}
              onChange={(event) => {
                const value = Number(event.target.value);
                setDefaults((prev) => ({
                  ...prev,
                  refundsAssumption: Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0,
                }));
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-600/50 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveDefaults}
            disabled={isSavingDefaults}
            className="rounded-xl border border-blue-600/40 bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-600/20"
          >
            {isSavingDefaults ? "Saving..." : "Save Defaults"}
          </button>
          {defaultsSavedState && (
            <p
              className={[
                "text-xs",
                defaultsSavedState.tone === "error" ? "text-amber-300" : "text-emerald-300",
              ].join(" ")}
              role={defaultsSavedState.tone === "error" ? "alert" : "status"}
            >
              {defaultsSavedState.message}
            </p>
          )}
        </div>
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Usage</p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Active Projects</p>
            <p className="mt-2 text-2xl font-black text-white">{activeProjectsCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Saved Financial Projects</p>
            <p className="mt-2 text-2xl font-black text-white">{savedProjectsCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Billing Entitlements</p>
            <p className="mt-2 text-sm font-semibold text-slate-300">Not connected yet</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Plan Limits</p>
            <p className="mt-2 text-sm font-semibold text-slate-300">{PLAN_LIMIT_SUMMARY[subscriptionTier]}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">Usage cards reflect currently available local financial-tool data and current plan lock state.</p>
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Data & Privacy</p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Current planning data in this release is stored on this device. Export tools and full account-level privacy controls will expand as backend support is completed.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onExportMyData}
            disabled={isExportingData}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
          >
            {isExportingData ? "Exporting..." : "Export My Data"}
          </button>
          <button
            type="button"
            onClick={() => void onSignOutAllSessions()}
            disabled={isLoadingUserContext || isSigningOutAllSessions}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
          >
            {isSigningOutAllSessions ? "Signing Out..." : "Sign Out Of All Sessions"}
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">Export includes local planning defaults and local financial project data.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link href="/privacy" className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300">Privacy Policy</Link>
          <Link href="/terms" className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300">Terms of Service</Link>
          <Link href="/refunds" className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300">Refund Policy</Link>
          <Link href="/cookies" className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300">Cookie Policy</Link>
          <Link href="/contact" className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300">Contact Support</Link>
        </div>
        {exportActionState && (
          <p
            className={[
              "mt-4 text-xs",
              exportActionState.tone === "error" ? "text-amber-300" : "text-emerald-300",
            ].join(" ")}
            role={exportActionState.tone === "error" ? "alert" : "status"}
          >
            {exportActionState.message}
          </p>
        )}
        {privacyActionState && (
          <p
            className={[
              "mt-4 text-xs",
              privacyActionState.tone === "error" ? "text-amber-300" : "text-emerald-300",
            ].join(" ")}
            role={privacyActionState.tone === "error" ? "alert" : "status"}
          >
            {privacyActionState.message}
          </p>
        )}
      </article>

      <article className="rounded-3xl border border-red-900/60 bg-red-950/20 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Danger Zone</p>
        <p className="mt-2 max-w-2xl text-sm text-red-200/90">
          Deleting your account will permanently remove your access and saved data.
        </p>

        <div className="mt-5 space-y-3">
          {!isDeleteAccountConfirmOpen ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteAccountConfirmOpen(true);
                  setDeleteAccountActionState(null);
                }}
                disabled={isLoadingUserContext || isDeletingAccount}
                className="rounded-xl border border-red-700 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-100 transition hover:border-red-500/70 hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Delete Account
              </button>
              <p className="text-xs text-red-200/80">
                This is permanent and will immediately cancel any active subscription on this account before deletion.
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-red-900/70 bg-red-950/40 p-4">
              <p className="text-sm font-semibold text-red-100">Delete this account permanently?</p>
              <p className="mt-2 text-xs leading-6 text-red-200/80">
                This removes your Hollow Metric account, deletes saved backend data tied to it, clears local planning data on this device, and signs you out.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteAccountConfirmOpen(false);
                    setDeleteAccountActionState(null);
                  }}
                  disabled={isDeletingAccount}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-red-600/40 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void onDeleteAccount()}
                  disabled={isLoadingUserContext || isDeletingAccount}
                  className="rounded-xl border border-red-700 bg-red-700/20 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-700/30 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDeletingAccount ? "Deleting Account..." : "Confirm Delete Account"}
                </button>
              </div>
            </div>
          )}
          {deleteAccountActionState && (
            <p
              className={[
                "text-xs",
                deleteAccountActionState.tone === "error" ? "text-amber-300" : "text-emerald-300",
              ].join(" ")}
              role={deleteAccountActionState.tone === "error" ? "alert" : "status"}
            >
              {deleteAccountActionState.message}
            </p>
          )}
        </div>
      </article>

      <InternalDebugPanel
        pageName="Settings"
        auth={settingsDebugAuth}
        items={[
          { label: "context state", value: settingsContextState },
          { label: "context error", value: contextError ?? "none" },
          { label: "subscription tier", value: subscriptionTier },
          { label: "billing status", value: billingStatus },
          { label: "subscription action state", value: subscriptionDebugState },
          { label: "renewal date", value: formattedRenewalDate ?? "unavailable" },
          { label: "saved project count", value: savedProjectsCount },
          { label: "local data notice", value: localDataNotice ?? "none" },
          { label: "defaults state", value: defaultsActionState },
          { label: "account action state", value: accountDebugState },
          { label: "export state", value: exportDebugState },
          { label: "privacy action state", value: privacyDebugState },
          { label: "delete account state", value: deleteAccountDebugState },
        ]}
      />
    </section>
  );
}
