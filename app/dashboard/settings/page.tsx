"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  type FinancialProject,
  getSavedFinancialProjects,
} from "@/lib/financial-projects";
import { openPaddleCheckout } from "@/lib/paddle";

type SubscriptionTier = "starter" | "launch-planner";

type PlanningDefaults = {
  withholdingTax: number;
  refundsAssumption: number;
};

const DEFAULTS_STORAGE_KEY = "hm_planning_defaults";

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

export default function SettingsPage() {
  const [signedInEmail, setSignedInEmail] = useState("Loading...");
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
  const [billingStatus, setBillingStatus] = useState("Loading...");
  const [renewalDate] = useState<string | null>(null);
  const [projects, setProjects] = useState<FinancialProject[]>([]);
  const [defaults, setDefaults] = useState<PlanningDefaults>(DEFAULT_PLANNING_DEFAULTS);
  const [defaultsSavedState, setDefaultsSavedState] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountActionState, setAccountActionState] = useState<string>("");
  const [exportActionState, setExportActionState] = useState<string>("");
  const [privacyActionState, setPrivacyActionState] = useState<string>("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserContext = async () => {
      const supabase = createClient();
      if (!supabase) {
        setSignedInEmail("Not available");
        setBillingStatus("Unavailable");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      if (entitlementError) {
        console.error("Failed to load live billing state for settings page", entitlementError);
        setSubscriptionTier("starter");
        setBillingStatus("Unavailable");
        return;
      }

      if (!entitlement) {
        setSubscriptionTier("starter");
        setBillingStatus("No billing record");
        return;
      }

      setSubscriptionTier(entitlement.tier === "pro" ? "launch-planner" : "starter");

      const liveBillingState =
        typeof entitlement.billing_state === "string" ? entitlement.billing_state.trim() : "";

      setBillingStatus(
        liveBillingState
          ? liveBillingState[0].toUpperCase() + liveBillingState.slice(1).replace(/_/g, " ")
          : "Unknown",
      );
    };

    void loadUserContext();
    setProjects(getSavedFinancialProjects());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedDefaultsRaw = window.localStorage.getItem(DEFAULTS_STORAGE_KEY);
      if (storedDefaultsRaw) {
        const parsed = JSON.parse(storedDefaultsRaw) as Partial<PlanningDefaults>;
        setDefaults({
          withholdingTax: Number.isFinite(parsed.withholdingTax) ? Number(parsed.withholdingTax) : DEFAULT_PLANNING_DEFAULTS.withholdingTax,
          refundsAssumption: Number.isFinite(parsed.refundsAssumption) ? Number(parsed.refundsAssumption) : DEFAULT_PLANNING_DEFAULTS.refundsAssumption,
        });
      }
    } catch {
      setDefaults(DEFAULT_PLANNING_DEFAULTS);
    }
  }, []);

  const maxProjects = useMemo(() => {
    if (subscriptionTier === "starter") return 0;
    return 1;
  }, [subscriptionTier]);

  const activeProjectsCount = maxProjects === Infinity ? projects.length : Math.min(projects.length, maxProjects);
  const savedProjectsCount = projects.length;

  const onSaveDefaults = () => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
    setDefaultsSavedState("Planning defaults saved on this device.");
  };

  const onChangeEmail = async () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAccountActionState("Enter a valid email address.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setAccountActionState("Could not connect to auth client.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAccountActionState("You must be signed in to change email.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (error) {
        setAccountActionState(error.message || "Could not update email right now.");
        return;
      }

      setAccountActionState("Email update submitted. Check your inbox to confirm if required.");
      setNewEmail("");
    } catch {
      setAccountActionState("Could not update email right now.");
    }
  };

  const onChangePassword = async () => {
    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 8) {
      setAccountActionState("Password must be at least 8 characters.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setAccountActionState("Could not connect to auth client.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAccountActionState("You must be signed in to change password.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
      if (error) {
        setAccountActionState(error.message || "Could not update password right now.");
        return;
      }

      setAccountActionState("Password updated.");
      setNewPassword("");
    } catch {
      setAccountActionState("Could not update password right now.");
    }
  };

  const onExportMyData = () => {
    if (typeof window === "undefined") return;

    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        account: {
          email: signedInEmail,
          plan: PLAN_LABELS[subscriptionTier],
        },
        planningDefaults: defaults,
        financialProjects: getSavedFinancialProjects(),
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

      setExportActionState("Exported local planning data as JSON.");
    } catch {
      setExportActionState("Could not export data right now.");
    }
  };

  const onSignOutAllSessions = async () => {
    const supabase = createClient();
    if (!supabase) {
      setPrivacyActionState("Could not connect to auth client.");
      return;
    }

    try {
      await supabase.auth.signOut({ scope: "global" });
      setPrivacyActionState("Signed out of all sessions.");
    } catch {
      setPrivacyActionState("Could not sign out all sessions right now.");
    }
  };

  const onUpgradeClick = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: "pro" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Checkout failed (${res.status})`);
      }
      const { priceId, userId, email } = (await res.json()) as {
        priceId: string;
        userId: string;
        email: string;
      };
      await openPaddleCheckout(priceId, { userId, email });
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Account</p>
            <p className="mt-4 text-sm text-slate-400">Signed in email</p>
            <p className="text-lg font-semibold text-white">{signedInEmail}</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-400">New email</span>
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void onChangeEmail()}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
            >
              Change Email
            </button>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-400">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void onChangePassword()}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
            >
              Change Password
            </button>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-500">
          Email and password updates are available now for signed-in users.
        </p>
        {accountActionState && <p className="mt-3 text-xs text-slate-500">{accountActionState}</p>}
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Subscription</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-slate-400">Current plan: <span className="font-semibold text-white">{PLAN_LABELS[subscriptionTier]}</span></p>
              <p className="text-slate-400">Billing status: <span className="font-semibold text-white">{billingStatus}</span></p>
              <p className="text-slate-400">Renewal date: <span className="font-semibold text-white">{renewalDate ?? "—"}</span></p>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-2">
            {subscriptionTier === "starter" ? (
              <button
                type="button"
                onClick={() => void onUpgradeClick()}
                disabled={checkoutLoading}
                aria-disabled={checkoutLoading}
                className="w-full rounded-xl border border-blue-700/50 bg-blue-600/20 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:border-blue-500 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkoutLoading ? "Opening checkout…" : "Upgrade to Pro"}
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
            {checkoutError && (
              <p className="text-xs text-red-400">{checkoutError}</p>
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
            className="rounded-xl border border-blue-600/40 bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-600/20"
          >
            Save Defaults
          </button>
          {defaultsSavedState && <p className="text-xs text-slate-500">{defaultsSavedState}</p>}
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
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
          >
            Export My Data
          </button>
          <button
            type="button"
            onClick={() => void onSignOutAllSessions()}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
          >
            Sign Out Of All Sessions
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
        {exportActionState && <p className="mt-4 text-xs text-slate-500">{exportActionState}</p>}
        {privacyActionState && <p className="mt-4 text-xs text-slate-500">{privacyActionState}</p>}
      </article>

      <article className="rounded-3xl border border-red-900/60 bg-red-950/20 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Danger Zone</p>
        <p className="mt-2 max-w-2xl text-sm text-red-200/90">
          Deleting your account will permanently remove your access and saved data.
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="cursor-not-allowed rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200/70 opacity-80"
          >
            Delete Account
          </button>
          <p className="text-xs text-red-200/80">Delete account flow is not available yet.</p>
        </div>
      </article>
    </section>
  );
}
