"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  type FinancialProject,
  getSavedFinancialProjects,
} from "@/lib/financial-projects";

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
  const [subscriptionTier] = useState<SubscriptionTier>("starter");
  const [billingStatus, setBillingStatus] = useState("Pending integration");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [projects, setProjects] = useState<FinancialProject[]>([]);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [defaults, setDefaults] = useState<PlanningDefaults>(DEFAULT_PLANNING_DEFAULTS);
  const [defaultsSavedState, setDefaultsSavedState] = useState<string>("");
  const [privacyActionState, setPrivacyActionState] = useState<string>("");

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
    return 1;
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
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-500 opacity-70"
            >
              Change Email
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-500 opacity-70"
            >
              Change Password
            </button>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-500">
          Account actions will be enabled in a later update.
        </p>
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
            <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-500">
              Current plan display uses placeholder subscription logic until Paddle integration is fully live.
            </p>
            <p className="mt-2 text-xs text-slate-500">Billing controls will appear once Paddle integration is live.</p>
          </div>

          <div className="w-full max-w-sm space-y-2">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full cursor-not-allowed rounded-xl border border-blue-900/30 bg-blue-950/20 px-4 py-2 text-sm font-semibold text-blue-400/70"
            >
              Manage Subscription
            </button>
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
            <p className="text-xs text-slate-500">Available after billing is live.</p>
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
            disabled
            aria-disabled="true"
            className="cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-500 opacity-70"
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

        <p className="mt-4 text-xs text-slate-500">Export controls will be enabled in a later update.</p>
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
