"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  type FinancialProject,
  getSavedFinancialProjects,
} from "@/lib/financial-projects";

type SubscriptionTier = "starter" | "launch-planner" | "studio";

type PlanningDefaults = {
  currency: "USD" | "EUR" | "GBP" | "CAD";
  withholdingTax: number;
  refundsAssumption: number;
};

const DEFAULTS_STORAGE_KEY = "hm_planning_defaults";

const PLAN_LABELS: Record<SubscriptionTier, string> = {
  starter: "Starter",
  "launch-planner": "Launch Planner",
  studio: "Studio",
};

const PLAN_LIMIT_SUMMARY: Record<SubscriptionTier, string> = {
  starter: "Launch Planner: not unlocked on Starter",
  "launch-planner": "Launch Planner: 1 active project",
  studio: "Studio: multiple active projects",
};

const DEFAULT_PLANNING_DEFAULTS: PlanningDefaults = {
  currency: "USD",
  withholdingTax: 30,
  refundsAssumption: 8,
};

export default function SettingsPage() {
  const showDevTierSelector = process.env.NODE_ENV !== "production";
  const [signedInEmail, setSignedInEmail] = useState("Loading...");
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
  const [billingStatus, setBillingStatus] = useState("Pending integration");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [projects, setProjects] = useState<FinancialProject[]>([]);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [defaults, setDefaults] = useState<PlanningDefaults>(DEFAULT_PLANNING_DEFAULTS);
  const [defaultsSavedState, setDefaultsSavedState] = useState<string>("");
  const [accountActionState, setAccountActionState] = useState<string>("");
  const [privacyActionState, setPrivacyActionState] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isBillingConnected = Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim());

  useEffect(() => {
    const loadUserContext = async () => {
      const supabase = createClient();
      if (!supabase) {
        setSignedInEmail("Not available");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSignedInEmail("Not signed in");
        setCreditBalance(0);
        return;
      }

      setSignedInEmail(user.email ?? "Email unavailable");

      try {
        const response = await fetch("/api/credits/balance", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          setCreditBalance(0);
          return;
        }

        const payload = (await response.json()) as { balance?: number };
        setCreditBalance(Number.isFinite(payload.balance) ? Number(payload.balance) : 0);
      } catch {
        setCreditBalance(0);
      }
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
          currency: parsed.currency === "EUR" || parsed.currency === "GBP" || parsed.currency === "CAD" ? parsed.currency : "USD",
          withholdingTax: Number.isFinite(parsed.withholdingTax) ? Number(parsed.withholdingTax) : DEFAULT_PLANNING_DEFAULTS.withholdingTax,
          refundsAssumption: Number.isFinite(parsed.refundsAssumption) ? Number(parsed.refundsAssumption) : DEFAULT_PLANNING_DEFAULTS.refundsAssumption,
        });
      }
    } catch {
      setDefaults(DEFAULT_PLANNING_DEFAULTS);
    }
  }, []);

  useEffect(() => {
    if (!isBillingConnected) {
      setBillingStatus("Pending integration");
      setRenewalDate(null);
      return;
    }

    setBillingStatus("Active");
    setRenewalDate("Available after Paddle integration is finalized");
  }, [isBillingConnected]);

  const maxProjects = useMemo(() => {
    if (subscriptionTier === "starter") return 0;
    if (subscriptionTier === "launch-planner") return 1;
    return Infinity;
  }, [subscriptionTier]);

  const activeProjectsCount = maxProjects === Infinity ? projects.length : Math.min(projects.length, maxProjects);
  const savedProjectsCount = projects.length;

  const onSaveDefaults = () => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
    setDefaultsSavedState("Planning defaults saved.");
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

  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Account</p>
            <p className="mt-4 text-sm text-slate-400">Signed in email</p>
            <p className="text-lg font-semibold text-white">{signedInEmail}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setAccountActionState("Change email flow is not connected yet.")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-600/40 hover:text-blue-300"
            >
              Change Email
            </button>
            <button
              type="button"
              onClick={() => setAccountActionState("Change password flow is not connected yet.")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-600/40 hover:text-blue-300"
            >
              Change Password
            </button>
          </div>
        </div>
        {accountActionState && <p className="mt-4 text-xs text-slate-500">{accountActionState}</p>}
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Subscription</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-slate-400">Current plan: <span className="font-semibold text-white">{PLAN_LABELS[subscriptionTier]}</span></p>
              <p className="text-slate-400">Billing status: <span className="font-semibold text-white">{billingStatus}</span></p>
              <p className="text-slate-400">Renewal date: <span className="font-semibold text-white">{renewalDate ?? "Not available yet"}</span></p>
            </div>
            {!isBillingConnected && (
              <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-500">
                Billing controls will be available once payment integration is connected.
              </p>
            )}
          </div>

          <div className="w-full max-w-sm space-y-2">
            {showDevTierSelector && (
              <div>
                <label htmlFor="settings-tier" className="mb-2 block text-xs font-semibold text-slate-500">
                  Current plan (dev placeholder)
                </label>
                <select
                  id="settings-tier"
                  value={subscriptionTier}
                  onChange={(event) => setSubscriptionTier(event.target.value as SubscriptionTier)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-600/50 focus:outline-none"
                >
                  <option value="starter">Starter</option>
                  <option value="launch-planner">Launch Planner</option>
                  <option value="studio">Studio</option>
                </select>
              </div>
            )}
            <button
              type="button"
              className="w-full rounded-xl border border-blue-600/40 bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-600/20"
            >
              Manage Subscription
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
            >
              Downgrade Subscription
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-600/40 hover:text-blue-300"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Planning Defaults</p>
        <p className="mt-2 text-xs text-slate-500">
          These defaults are used to prefill new launch budget projects.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-400">Default currency</span>
            <select
              value={defaults.currency}
              onChange={(event) => setDefaults((prev) => ({ ...prev, currency: event.target.value as PlanningDefaults["currency"] }))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-600/50 focus:outline-none"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
          </label>

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
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Credit Balance</p>
            <p className="mt-2 text-2xl font-black text-white">{creditBalance}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Plan Limits</p>
            <p className="mt-2 text-sm font-semibold text-slate-300">{PLAN_LIMIT_SUMMARY[subscriptionTier]}</p>
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">Data & Privacy</p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Your launch planning data is scoped to your account. Export tools and full privacy controls will be expanded as backend support is completed.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setPrivacyActionState("Export is not connected yet. This control is ready for backend wiring.")}
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
            onClick={() => setShowDeleteConfirm((prev) => !prev)}
            className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-700 hover:bg-red-950/80"
          >
            Delete Account
          </button>

          {showDeleteConfirm && (
            <div className="rounded-xl border border-red-900/70 bg-red-950/50 p-4">
              <p className="text-sm text-red-100">Delete account flow is not connected yet. This confirmation state is in place for backend wiring.</p>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="mt-3 rounded-lg border border-red-800 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-900/30"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
