"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DollarSign, FolderOpen, ArrowRight } from "lucide-react";
import {
  FINANCIAL_PROJECTS_UPDATED_EVENT,
  fetchSavedFinancialProjectsState,
  type FinancialProject,
} from "@/lib/financial-projects";
import { createClient } from "@/utils/supabase/client";

type SubscriptionTier = "starter" | "launch-planner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getDashboardLoadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("network") || message.includes("fetch")) {
    return "We couldn't load your dashboard right now. Please check your connection and try again.";
  }

  if (message.includes("invalid dashboard data") || message.includes("missing dashboard data")) {
    return "Some dashboard data is temporarily unavailable. Please try again in a moment.";
  }

  return "We couldn't load your saved dashboard data right now. Please try again in a moment.";
}

function formatBillingStatusLabel(status: string | null | undefined, fallback = "Unknown"): string {
  if (typeof status !== "string" || status.trim().length === 0) {
    return fallback;
  }

  const normalized = status.trim().replace(/_/g, " ");
  return normalized[0].toUpperCase() + normalized.slice(1);
}

export default function DashboardPage() {
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
  const [billingStatus, setBillingStatus] = useState("Loading...");
  const [projects, setProjects] = useState<FinancialProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const applyLockedDashboardState = (nextBillingStatus = "Unavailable") => {
      if (!mounted) {
        return;
      }

      setSubscriptionTier("starter");
      setBillingStatus(nextBillingStatus);
      setProjects([]);
      setLoadError(null);
    };

    const loadProjects = async (sessionOverride?: Session | null) => {
      if (!mounted) {
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        if (!supabase) {
          throw new Error("missing dashboard auth client");
        }

        const sessionResult = sessionOverride
          ? { data: { session: sessionOverride }, error: null }
          : await supabase.auth.getSession();
        const session = sessionResult.data.session;

        if (sessionResult.error) {
          throw sessionResult.error;
        }

        if (!session?.user || !session.access_token) {
          applyLockedDashboardState();
          return;
        }

        const { data: entitlement, error: entitlementError } = await supabase
          .from("user_entitlements")
          .select("tier, premium_access, billing_state")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (entitlementError) {
          throw entitlementError;
        }

        const normalizedBillingState =
          typeof entitlement?.billing_state === "string"
            ? entitlement.billing_state.trim().toLowerCase()
            : "";
        const hasPaidAccess =
          entitlement?.tier === "pro" &&
          entitlement.premium_access === true &&
          normalizedBillingState === "active";
        const derivedBillingStatus = entitlement
          ? formatBillingStatusLabel(entitlement.billing_state, "Unknown")
          : "No billing record";

        if (!hasPaidAccess) {
          applyLockedDashboardState(derivedBillingStatus);
          return;
        }

        const result = await fetchSavedFinancialProjectsState(session.access_token);

        if (!result || !result.access || !Array.isArray(result.projects)) {
          throw new Error("invalid dashboard data");
        }

        if (!mounted) {
          return;
        }

        setSubscriptionTier(result.access.subscriptionTier === "launch-planner" ? "launch-planner" : "starter");
        setBillingStatus(
          typeof result.access.billingStatus === "string" && result.access.billingStatus.trim()
            ? result.access.billingStatus
            : "Unavailable"
        );
        setProjects(result.projects);
      } catch (error) {
        console.error("Failed to load saved financial projects for dashboard", error);

        if (!mounted) {
          return;
        }

        setLoadError(getDashboardLoadErrorMessage(error));
        setSubscriptionTier("starter");
        setBillingStatus("Unavailable");
        setProjects([]);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const refresh = () => {
      void loadProjects();
    };

    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      if (!session?.user || !session.access_token) {
        applyLockedDashboardState();
        setIsLoading(false);
        return;
      }

      void loadProjects(session);
    });

    void loadProjects();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener(FINANCIAL_PROJECTS_UPDATED_EVENT, refresh);

    return () => {
      mounted = false;
      authSubscription?.data.subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener(FINANCIAL_PROJECTS_UPDATED_EVENT, refresh);
    };
  }, []);

  const displayBillingStatus = isLoading ? "Loading..." : billingStatus;
  const canAccessLibrary = subscriptionTier !== "starter";
  const activeProject = canAccessLibrary ? projects[0] ?? null : null;
  const recentCount = canAccessLibrary ? projects.length : 0;
  const warningCount =
    activeProject && typeof activeProject.budgetStatus === "string" && activeProject.budgetStatus.toLowerCase() !== "balanced"
      ? 1
      : 0;
  const breakEvenValue = isLoading
    ? "Loading..."
    : loadError
      ? "Unavailable"
      : activeProject
        ? `${activeProject.roughBreakEvenCopies.toLocaleString()}`
        : "Not calculated yet";
  const plannedSpendValue = isLoading
    ? "Loading..."
    : loadError
      ? "Unavailable"
      : activeProject
        ? formatCurrency(activeProject.totalPlannedSpend)
        : "No budget saved yet";
  const lastUpdatedValue = isLoading
    ? "Loading..."
    : loadError
      ? "Unavailable"
      : activeProject
        ? activeProject.lastUpdated
        : "No saved project";
  const lastUpdatedLabel = isLoading
    ? "fetching project"
    : loadError
      ? "dashboard data"
      : activeProject
        ? activeProject.name
        : "project name";
  const warningsValue = isLoading ? "Loading..." : loadError ? "Unavailable" : activeProject ? warningCount.toString() : "None yet";
  const libraryDescription = isLoading
    ? "Loading your saved launch data..."
    : loadError
      ? "Saved launch data is temporarily unavailable. Try again in a moment."
      : canAccessLibrary
        ? "Review the saved launch budget currently available on your account."
        : "Library access is not included on Starter.";

  return (
    <section className="space-y-8 sm:space-y-10">
      <div>
        <h1 className="mb-2 text-2xl font-black tracking-tight text-white sm:text-4xl">
          Launch Decision Workspace
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Track your launch budget, test price points, and catch weak budget assumptions before expensive decisions are locked in.
        </p>
        {isLoading && <p className="mt-3 text-sm text-slate-500">Loading your saved launch data...</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Current Break-Even</p>
          <p className="text-2xl font-black text-blue-500 sm:text-3xl">{breakEvenValue}</p>
          <p className="text-slate-500 text-sm mt-2">copies to sell</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Total Planned Spend</p>
          <p className="text-2xl font-black text-white sm:text-3xl">{plannedSpendValue}</p>
          <p className="text-slate-500 text-sm mt-2">launch costs</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Last Updated</p>
          <p className="text-xl font-black text-white sm:text-2xl">{lastUpdatedValue}</p>
          <p className="text-slate-500 text-sm mt-2">{lastUpdatedLabel}</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Active Warnings</p>
          <p className="text-2xl font-black text-blue-500 sm:text-3xl">{warningsValue}</p>
          <p className="text-slate-500 text-sm mt-2">issues to address</p>
        </div>
      </div>

      {loadError && !isLoading && (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6">
          <p className="text-sm font-semibold text-rose-200">{loadError}</p>
          <p className="mt-2 text-sm text-slate-300">
            You can still use Launch Budget while saved project data is temporarily unavailable.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/dashboard/budgeter"
          className="group relative rounded-3xl border border-blue-600/40 bg-gradient-to-br from-blue-600/20 to-blue-600/5 p-6 transition-all hover:border-blue-600/60 hover:from-blue-600/30 hover:shadow-xl hover:shadow-blue-600/20 sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white mb-2">Launch Budget</h2>
              <p className="text-slate-400 max-w-xs text-sm mb-4">
                Estimate your launch costs, test price points, and track your path to break-even.
              </p>
            </div>
            <div className="rounded-2xl bg-blue-600/20 p-3 group-hover:bg-blue-600/30 transition-all">
              <DollarSign size={24} className="text-blue-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-400 group-hover:gap-3 transition-all mt-4">
            <span className="text-sm font-semibold">Open Launch Budget</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        <Link
          href="/dashboard/financial-library"
          className="group rounded-3xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-blue-600/40 hover:shadow-xl hover:shadow-blue-600/10 sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Saved Projects</p>
              <h2 className="text-2xl font-black text-white mb-2">Financial Library</h2>
              <p className="text-slate-400 max-w-xs text-sm mb-2">{libraryDescription}</p>
              <p className="text-xs text-slate-500">Billing status: {displayBillingStatus}</p>
            </div>
            <div className="rounded-2xl bg-slate-800/50 p-3 group-hover:bg-blue-600/20 transition-all">
              <FolderOpen size={24} className="text-slate-400 group-hover:text-blue-300 transition-all" />
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 group-hover:gap-3 transition-all">
            Open Financial Library <ArrowRight size={16} />
          </div>
        </Link>
      </div>

      {canAccessLibrary && recentCount > 0 && (
        <div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-black text-white">Recent Projects</h3>
            <Link href="/dashboard/financial-library" className="text-blue-400 hover:text-blue-300 transition-all font-semibold text-sm flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project) => (
              <Link
                key={project.id}
                href="/dashboard/financial-library"
                className="group rounded-3xl border border-slate-800 bg-slate-900/60 hover:border-blue-600/40 transition-all p-6 hover:shadow-xl hover:shadow-blue-600/10"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-3">Launch Project</p>
                <h4 className="text-lg font-black text-white mb-3 group-hover:text-blue-400 transition-all line-clamp-2">
                  {project.name}
                </h4>

                <div className="space-y-2 text-sm">
                  <p className="text-slate-400"><span className="text-slate-500">Last updated:</span> {project.lastUpdated}</p>
                  <p className="text-slate-400"><span className="text-slate-500">Total planned spend:</span> {formatCurrency(project.totalPlannedSpend)}</p>
                  <p className="text-slate-400"><span className="text-slate-500">Main price point:</span> ${project.mainPricePoint.toFixed(2)}</p>
                  <p className="text-slate-400"><span className="text-slate-500">Rough break-even:</span> {project.roughBreakEvenCopies.toLocaleString()} copies</p>
                </div>

                <p className="mt-3 text-xs text-slate-500">Budget status: {project.budgetStatus}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !loadError && recentCount === 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-center sm:p-12">
          <p className="text-slate-200 font-semibold mb-2">
            {canAccessLibrary ? "No saved launch budgets yet." : "Saved launch budgets unlock on Launch Planner."}
          </p>
          <p className="text-slate-500 text-sm mb-6">
            {canAccessLibrary
              ? "Build or update your launch budget to save the current project into Financial Library."
              : "Starter includes calculator access only. Upgrade to Launch Planner to unlock saved projects."}
          </p>
          <Link
            href="/dashboard/budgeter"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 transition-all"
          >
            <DollarSign size={16} />
            Build Launch Budget
          </Link>
        </div>
      )}
    </section>
  );
}
