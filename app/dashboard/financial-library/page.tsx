"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Lock, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  type FinancialProject,
  FINANCIAL_PROJECTS_STORAGE_KEY,
  FINANCIAL_PROJECTS_UPDATED_EVENT,
  getSavedFinancialProjects,
} from "@/lib/financial-projects";

type SubscriptionTier = "starter" | "launch-planner";
const EMPTY_PROJECTS_SNAPSHOT: FinancialProject[] = [];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const getServerProjectsSnapshot = (): FinancialProject[] => EMPTY_PROJECTS_SNAPSHOT;

const subscribeToSavedProjects = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleFocus = () => {
    onStoreChange();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      onStoreChange();
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === FINANCIAL_PROJECTS_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleProjectsUpdated = () => {
    onStoreChange();
  };

  window.addEventListener("focus", handleFocus);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(FINANCIAL_PROJECTS_UPDATED_EVENT, handleProjectsUpdated);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(FINANCIAL_PROJECTS_UPDATED_EVENT, handleProjectsUpdated);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};

export default function FinancialLibraryPage() {
  // TODO(security): In production, tier must come from trusted billing state server-side.
  // TODO(security): Financial Library data must be loaded from server with per-user isolation (RLS), not localStorage.
  const router = useRouter();
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
  const [billingStatus, setBillingStatus] = useState("Loading...");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const projects = useSyncExternalStore(
    subscribeToSavedProjects,
    getSavedFinancialProjects,
    getServerProjectsSnapshot,
  );

  useEffect(() => {
    const loadBillingContext = async () => {
      const supabase = createClient();
      if (!supabase) {
        setSubscriptionTier("starter");
        setBillingStatus("Unavailable");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSubscriptionTier("starter");
        setBillingStatus("Not signed in");
        return;
      }

      const { data: entitlement, error } = await supabase
        .from("user_entitlements")
        .select("tier, premium_access, billing_state")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load live billing state for financial library page", error);
        setSubscriptionTier("starter");
        setBillingStatus("Unavailable");
        return;
      }

      if (!entitlement) {
        setSubscriptionTier("starter");
        setBillingStatus("No billing record");
        return;
      }

      const hasPaidAccess =
        entitlement.tier === "pro" &&
        entitlement.premium_access === true &&
        entitlement.billing_state === "active";

      setSubscriptionTier(hasPaidAccess ? "launch-planner" : "starter");

      const liveBillingState =
        typeof entitlement.billing_state === "string" ? entitlement.billing_state.trim() : "";

      setBillingStatus(
        liveBillingState
          ? liveBillingState[0].toUpperCase() + liveBillingState.slice(1).replace(/_/g, " ")
          : "Unknown",
      );
    };

    void loadBillingContext();
  }, []);

  const canAccessLibrary = subscriptionTier !== "starter";
  const currentPlanLabel = subscriptionTier === "launch-planner" ? "Launch Planner" : "Starter";
  const hasSavedProject = projects.length > 0;

  const visibleProjects = useMemo(() => {
    if (subscriptionTier === "launch-planner") return projects.slice(0, 1);
    return [];
  }, [projects, subscriptionTier]);

  const onOpenLaunchBudget = () => {
    setLimitMessage(null);

    if (subscriptionTier === "starter") {
      setLimitMessage("Saving projects is locked on Starter and not available until billing goes live.");
      return;
    }

    router.push("/dashboard/budgeter");
  };

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-slate-900 bg-slate-900/25 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:w-64">
            <p className="text-xs text-slate-500">Current plan: {currentPlanLabel}. Billing status: {billingStatus}.</p>
          </div>
          <p className="text-xs text-slate-500">
            {canAccessLibrary
              ? "Project saving is unlocked for your active Launch Planner access."
              : "Project saving and paid access unlock with an active Launch Planner subscription."}
          </p>
        </div>
      </div>

      {!canAccessLibrary ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-8 opacity-90">
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300">
            <Lock size={14} /> Paid Feature
          </div>
          <h3 className="text-2xl font-black text-white">Financial Library</h3>
          <p className="mt-2 max-w-2xl text-slate-400">
            Saving and revisiting financial projects is locked on Starter.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Paid access is not available yet while billing is pending.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenLaunchBudget}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                "border-blue-600/40 bg-blue-600/10 text-blue-300 hover:bg-blue-600/15",
              ].join(" ")}
            >
              <Plus size={16} /> {hasSavedProject ? "Open Launch Budget" : "Create In Launch Budget"}
            </button>
            <p className="text-xs text-slate-500">
              {subscriptionTier === "launch-planner"
                ? "Launch Planner: up to 1 saved project"
                : "Starter: project saving locked"}
            </p>
          </div>

          {hasSavedProject && (
            <div className="rounded-2xl border border-amber-600/30 bg-amber-600/10 px-4 py-3 text-sm text-amber-200">
              Financial Library reflects your currently saved Launch Budget project. Update it from Launch Budget to refresh this view.
            </div>
          )}

          {limitMessage && (
            <div className="rounded-2xl border border-amber-600/30 bg-amber-600/10 px-4 py-3 text-sm text-amber-200">
              {limitMessage}
            </div>
          )}

          <div className="space-y-4">
            {visibleProjects.map((project) => {
              const isExpanded = expandedProjectId === project.id;

              return (
                <article
                  key={project.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6"
                >
                  <button
                    onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-transparent p-1 transition hover:border-slate-700/70 hover:bg-slate-900/40">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight text-white">{project.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">Last updated {project.lastUpdated}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="hidden text-xs text-slate-500 md:block">{isExpanded ? "Click to collapse" : "Click to expand"}</p>
                        <span className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-300">
                          <ChevronDown size={16} className={isExpanded ? "rotate-180 transition-transform" : "transition-transform"} />
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <p className="text-[11px] text-slate-500">Total planned spend</p>
                        <p className="mt-1 text-sm font-black text-white">{formatCurrency(project.totalPlannedSpend)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <p className="text-[11px] text-slate-500">Main price point</p>
                        <p className="mt-1 text-sm font-black text-white">${project.mainPricePoint.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <p className="text-[11px] text-slate-500">Rough break-even</p>
                        <p className="mt-1 text-sm font-black text-white">{project.roughBreakEvenCopies.toLocaleString()} copies</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <p className="text-[11px] text-slate-500">Budget status summary</p>
                        <p className="mt-1 text-sm font-semibold text-slate-300">{project.budgetStatus}</p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Expense breakdown</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {project.expenses.map((expense) => (
                            <div key={expense.name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                              <span className="text-sm text-slate-300">{expense.name}</span>
                              <span className="text-sm font-semibold text-white">{formatCurrency(expense.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <p className="text-[11px] text-slate-500">Platform/tax assumptions</p>
                          <p className="mt-2 text-sm text-slate-300">Steam fee: {project.platformFee}%</p>
                          <p className="text-sm text-slate-300">U.S. withholding: {project.withholdingTax}%</p>
                          <p className="text-sm text-slate-300">Refund assumption: {project.refundsAssumption}%</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <p className="text-[11px] text-slate-500">Selected price points</p>
                          <p className="mt-2 text-sm text-slate-300">{project.pricePoints.map((v) => `$${v.toFixed(2)}`).join(" / ")}</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <p className="text-[11px] text-slate-500">Rough break-even results</p>
                          <p className="mt-2 text-sm text-slate-300">{project.breakEvenResults.map((v) => v.toLocaleString()).join(" / ")} copies</p>
                        </div>
                      </div>

                      {project.planningReview && (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <p className="text-[11px] text-slate-500">Planning review summary</p>
                          <p className="mt-2 text-sm text-slate-300">Budget health score: {project.planningReview.healthScore}/100</p>
                          <p className="text-sm text-slate-300">Sales target pressure: {project.planningReview.salesTargetPressure}</p>
                          <p className="text-sm text-slate-300">Cost structure signal: {project.planningReview.costStructureSignal}</p>
                        </div>
                      )}

                      {project.postLaunchActuals && (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <p className="text-[11px] text-slate-500">Post-launch actuals summary</p>
                          <p className="mt-2 text-sm text-slate-300">Actual copies sold: {project.postLaunchActuals.actualCopiesSold.toLocaleString()}</p>
                          {typeof project.postLaunchActuals.actualLaunchPrice === "number" && (
                            <p className="text-sm text-slate-300">
                              Actual launch price used: {project.postLaunchActuals.actualLaunchPricePoint ? `Price Point ${project.postLaunchActuals.actualLaunchPricePoint} ` : ""}(${`$${project.postLaunchActuals.actualLaunchPrice.toFixed(2)}`})
                            </p>
                          )}
                          <p className="text-sm text-slate-300">
                            Actual refunds: {project.postLaunchActuals.actualRefunds !== null ? `${project.postLaunchActuals.actualRefunds.toFixed(1)}%` : "Not provided"}
                          </p>
                          {typeof project.postLaunchActuals.actualGrossRevenue === "number" && (
                            <p className="text-sm text-slate-300">Actual gross revenue: {formatCurrency(project.postLaunchActuals.actualGrossRevenue)}</p>
                          )}
                          <p className="text-sm text-slate-300">Actual net revenue: {formatCurrency(project.postLaunchActuals.actualNetRevenue)}</p>
                          <p className="mt-1 text-sm font-semibold text-blue-300">{project.postLaunchActuals.comparisonSummary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
