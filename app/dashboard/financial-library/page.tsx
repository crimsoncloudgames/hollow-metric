"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Lock, Plus, Trash2 } from "lucide-react";
import {
  clearSavedFinancialProjects,
  fetchSavedFinancialProjectsState,
  type FinancialProject,
  FINANCIAL_PROJECTS_UPDATED_EVENT,
} from "@/lib/financial-projects";

type SubscriptionTier = "starter" | "launch-planner";
type ProjectActionFeedback = {
  tone: "success" | "error";
  message: string;
};

type DisplayFinancialProject = {
  id: string;
  name: string;
  lastUpdated: string;
  totalPlannedSpend: number;
  mainPricePoint: number;
  roughBreakEvenCopies: number;
  budgetStatus: string;
  expenses: Array<{
    name: string;
    amount: number;
  }>;
  platformFee: number;
  withholdingTax: number;
  refundsAssumption: number;
  pricePoints: number[];
  breakEvenResults: number[];
  planningReview:
    | {
        healthScore: number;
        salesTargetPressure: string;
        costStructureSignal: string;
      }
    | null;
  postLaunchActuals:
    | {
        actualCopiesSold: number;
        actualLaunchPrice: number | null;
        actualLaunchPricePoint: number | null;
        actualRefunds: number | null;
        actualGrossRevenue: number | null;
        actualNetRevenue: number;
        comparisonSummary: string;
      }
    | null;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeCurrencyValue(value: unknown): number {
  return Math.max(0, toFiniteNumber(value, 0));
}

function sanitizeCountValue(value: unknown): number {
  return Math.max(0, Math.trunc(toFiniteNumber(value, 0)));
}

function sanitizePercentValue(value: unknown): number {
  return Math.max(0, Math.min(100, toFiniteNumber(value, 0)));
}

function getFinancialLibraryLoadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("network") || message.includes("fetch")) {
    return "We couldn't load your Financial Library right now. Please check your connection and try again.";
  }

  if (message.includes("invalid financial library data") || message.includes("malformed")) {
    return "Your saved project data is temporarily unavailable. Please try again in a moment.";
  }

  return "We couldn't load your saved financial projects right now. Please try again in a moment.";
}

function getClearProjectErrorMessage(status: number | null, message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (status === 401) {
    return "Please sign in again before clearing your saved project.";
  }

  if (status === 403) {
    return "Your account can't clear the saved project right now.";
  }

  if (status === 429 || normalizedMessage.includes("too many")) {
    return "Too many clear attempts. Please wait a moment and try again.";
  }

  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return "We couldn't clear the saved project right now. Please check your connection and try again.";
  }

  if (normalizedMessage.includes("invalid delete response") || normalizedMessage.includes("unexpected")) {
    return "The clear request returned an unexpected response. Please try again.";
  }

  return message.trim() || "We couldn't clear the saved project right now. Please try again.";
}

function normalizeProjectForDisplay(project: FinancialProject): DisplayFinancialProject {
  const expenses = Array.isArray(project.expenses)
    ? project.expenses
        .map((expense, index) => ({
          name:
            typeof expense?.name === "string" && expense.name.trim()
              ? expense.name.trim()
              : `Expense ${index + 1}`,
          amount: sanitizeCurrencyValue(expense?.amount),
        }))
        .filter((expense) => expense.amount > 0 || expense.name.trim().length > 0)
    : [];

  const pricePoints = Array.isArray(project.pricePoints)
    ? project.pricePoints.map((value) => sanitizeCurrencyValue(value)).filter((value) => value > 0)
    : [];

  const breakEvenResults = Array.isArray(project.breakEvenResults)
    ? project.breakEvenResults
        .map((value) => sanitizeCountValue(value))
        .filter((value) => value > 0)
    : [];

  const planningReview = project.planningReview
    ? {
        healthScore: sanitizeCountValue(project.planningReview.healthScore),
        salesTargetPressure:
          typeof project.planningReview.salesTargetPressure === "string" &&
          project.planningReview.salesTargetPressure.trim()
            ? project.planningReview.salesTargetPressure
            : "Unavailable",
        costStructureSignal:
          typeof project.planningReview.costStructureSignal === "string" &&
          project.planningReview.costStructureSignal.trim()
            ? project.planningReview.costStructureSignal
            : "Unavailable",
      }
    : null;

  const postLaunchActuals = project.postLaunchActuals
    ? {
        actualCopiesSold: sanitizeCountValue(project.postLaunchActuals.actualCopiesSold),
        actualLaunchPrice:
          typeof project.postLaunchActuals.actualLaunchPrice === "number"
            ? sanitizeCurrencyValue(project.postLaunchActuals.actualLaunchPrice)
            : null,
        actualLaunchPricePoint:
          typeof project.postLaunchActuals.actualLaunchPricePoint === "number"
            ? sanitizeCountValue(project.postLaunchActuals.actualLaunchPricePoint)
            : null,
        actualRefunds:
          typeof project.postLaunchActuals.actualRefunds === "number"
            ? sanitizePercentValue(project.postLaunchActuals.actualRefunds)
            : null,
        actualGrossRevenue:
          typeof project.postLaunchActuals.actualGrossRevenue === "number"
            ? sanitizeCurrencyValue(project.postLaunchActuals.actualGrossRevenue)
            : null,
        actualNetRevenue: sanitizeCurrencyValue(project.postLaunchActuals.actualNetRevenue),
        comparisonSummary:
          typeof project.postLaunchActuals.comparisonSummary === "string" &&
          project.postLaunchActuals.comparisonSummary.trim()
            ? project.postLaunchActuals.comparisonSummary
            : "Summary unavailable",
      }
    : null;

  return {
    id: typeof project.id === "string" && project.id.trim() ? project.id : "saved-project",
    name: typeof project.name === "string" && project.name.trim() ? project.name : "Untitled project",
    lastUpdated:
      typeof project.lastUpdated === "string" && project.lastUpdated.trim()
        ? project.lastUpdated
        : "Unknown date",
    totalPlannedSpend: sanitizeCurrencyValue(project.totalPlannedSpend),
    mainPricePoint: sanitizeCurrencyValue(project.mainPricePoint),
    roughBreakEvenCopies: sanitizeCountValue(project.roughBreakEvenCopies),
    budgetStatus:
      typeof project.budgetStatus === "string" && project.budgetStatus.trim()
        ? project.budgetStatus
        : "Unavailable",
    expenses,
    platformFee: sanitizePercentValue(project.platformFee),
    withholdingTax: sanitizePercentValue(project.withholdingTax),
    refundsAssumption: sanitizePercentValue(project.refundsAssumption),
    pricePoints,
    breakEvenResults,
    planningReview,
    postLaunchActuals,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FinancialLibraryPage() {
  const router = useRouter();
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
  const [billingStatus, setBillingStatus] = useState("Loading...");
  const [projects, setProjects] = useState<FinancialProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [projectActionFeedback, setProjectActionFeedback] =
    useState<ProjectActionFeedback | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadFinancialProjects = async () => {
      if (!mounted) {
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const result = await fetchSavedFinancialProjectsState();

        if (!result || !result.access || !Array.isArray(result.projects)) {
          throw new Error("invalid financial library data");
        }

        if (!mounted) {
          return;
        }

        setSubscriptionTier(
          result.access.subscriptionTier === "launch-planner" ? "launch-planner" : "starter"
        );
        setBillingStatus(
          typeof result.access.billingStatus === "string" && result.access.billingStatus.trim()
            ? result.access.billingStatus
            : "Unavailable"
        );
        setProjects(result.projects);

        if (result.access.subscriptionTier === "starter") {
          setExpandedProjectId(null);
        }
      } catch (error) {
        console.error(
          "Failed to load saved financial projects for financial library page",
          error
        );

        if (!mounted) {
          return;
        }

        setLoadError(getFinancialLibraryLoadErrorMessage(error));
        setSubscriptionTier("starter");
        setBillingStatus("Unavailable");
        setProjects([]);
        setExpandedProjectId(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const refresh = () => {
      void loadFinancialProjects();
    };

    void loadFinancialProjects();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener(FINANCIAL_PROJECTS_UPDATED_EVENT, refresh);

    return () => {
      mounted = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener(FINANCIAL_PROJECTS_UPDATED_EVENT, refresh);
    };
  }, []);

  const canAccessLibrary = subscriptionTier !== "starter";
  const currentPlanLabel = subscriptionTier === "launch-planner" ? "Launch Planner" : "Starter";

  const visibleProjects = useMemo(() => {
    if (subscriptionTier === "launch-planner") {
      return projects.slice(0, 1).map((project) => normalizeProjectForDisplay(project));
    }

    return [];
  }, [projects, subscriptionTier]);

  const hasSavedProject = visibleProjects.length > 0;

  const onOpenLaunchBudget = () => {
    if (isDeletingProject) {
      return;
    }

    setLimitMessage(null);

    if (subscriptionTier === "starter") {
      setLimitMessage("Saving projects is locked on Starter and not available until billing goes live.");
      return;
    }

    router.push("/dashboard/budgeter");
  };

  const onClearSavedProject = async () => {
    if (isDeletingProject || isLoading) {
      return;
    }

    setLimitMessage(null);
    setProjectActionFeedback(null);

    if (!hasSavedProject) {
      setProjectActionFeedback({
        tone: "error",
        message: "There is no saved financial project to clear.",
      });
      return;
    }

    const confirmed = window.confirm(
      "Clear your saved financial project? This removes it from your account and Financial Library."
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingProject(true);

    try {
      const response = await fetch("/api/save-financial-project", {
        method: "DELETE",
      });

      const rawResponse = await response.text();
      let result: { success?: boolean; error?: string } | null = null;

      if (rawResponse) {
        try {
          result = JSON.parse(rawResponse) as { success?: boolean; error?: string };
        } catch {
          result = null;
        }
      }

      if (!response.ok || !result?.success) {
        throw new Error(
          getClearProjectErrorMessage(
            response.status,
            result?.error ?? rawResponse.trim() ?? "invalid delete response"
          )
        );
      }

      clearSavedFinancialProjects();
      setProjects([]);
      setExpandedProjectId(null);
      setProjectActionFeedback({
        tone: "success",
        message: "Saved financial project cleared.",
      });
    } catch (error) {
      setProjectActionFeedback({
        tone: "error",
        message: getClearProjectErrorMessage(
          null,
          error instanceof Error ? error.message : ""
        ),
      });
    } finally {
      setIsDeletingProject(false);
    }
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

      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-8 opacity-90">
          <h3 className="text-2xl font-black text-white">Financial Library</h3>
          <p className="mt-2 max-w-2xl text-slate-400">
            Loading your saved financial project...
          </p>
        </div>
      ) : loadError ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-8 opacity-90">
          <h3 className="text-2xl font-black text-white">Financial Library</h3>
          <p className="mt-2 max-w-2xl text-amber-200" role="alert">
            {loadError}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Your saved project list is temporarily unavailable. Try again in a moment or return to Launch Budget.
          </p>
        </div>
      ) : !canAccessLibrary ? (
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
              disabled={isDeletingProject}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                isDeletingProject
                  ? "cursor-not-allowed border-slate-800 bg-slate-900/60 text-slate-500"
                  : "border-blue-600/40 bg-blue-600/10 text-blue-300 hover:bg-blue-600/15",
              ].join(" ")}
            >
              <Plus size={16} /> {hasSavedProject ? "Open Launch Budget" : "Create In Launch Budget"}
            </button>
            {hasSavedProject && (
              <button
                type="button"
                onClick={() => {
                  void onClearSavedProject();
                }}
                disabled={isDeletingProject}
                className={[
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  isDeletingProject
                    ? "cursor-not-allowed border-slate-800 bg-slate-900/60 text-slate-500"
                    : "border-rose-600/40 bg-rose-600/10 text-rose-200 hover:bg-rose-600/15",
                ].join(" ")}
              >
                <Trash2 size={16} /> {isDeletingProject ? "Clearing..." : "Clear Saved Project"}
              </button>
            )}
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
            <div className="rounded-2xl border border-amber-600/30 bg-amber-600/10 px-4 py-3 text-sm text-amber-200" role="alert">
              {limitMessage}
            </div>
          )}

          {projectActionFeedback && (
            <div
              role={projectActionFeedback.tone === "error" ? "alert" : "status"}
              className={[
                "rounded-2xl px-4 py-3 text-sm",
                projectActionFeedback.tone === "success"
                  ? "border border-emerald-600/30 bg-emerald-600/10 text-emerald-200"
                  : "border border-amber-600/30 bg-amber-600/10 text-amber-200",
              ].join(" ")}
            >
              {projectActionFeedback.message}
            </div>
          )}

          {!hasSavedProject ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
              <h3 className="text-2xl font-black text-white">No saved project yet</h3>
              <p className="mt-2 max-w-2xl text-slate-400">
                Save your current Launch Budget project to see it here in Financial Library.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleProjects.map((project) => {
              const isExpanded = expandedProjectId === project.id;
              const projectExpenses = project.expenses;
              const projectPricePoints = project.pricePoints;
              const projectBreakEvenResults = project.breakEvenResults;

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
                        <p className="mt-1 text-sm font-black text-white">{project.mainPricePoint > 0 ? `$${project.mainPricePoint.toFixed(2)}` : "Unavailable"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <p className="text-[11px] text-slate-500">Rough break-even</p>
                        <p className="mt-1 text-sm font-black text-white">{project.roughBreakEvenCopies > 0 ? `${project.roughBreakEvenCopies.toLocaleString()} copies` : "Unavailable"}</p>
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
                        {projectExpenses.length > 0 ? (
                          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                            {projectExpenses.map((expense) => (
                              <div key={`${project.id}-${expense.name}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                                <span className="text-sm text-slate-300">{expense.name}</span>
                                <span className="text-sm font-semibold text-white">{formatCurrency(expense.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-slate-400">Expense details are unavailable for this saved project.</p>
                        )}
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
                          <p className="mt-2 text-sm text-slate-300">
                            {projectPricePoints.length > 0
                              ? projectPricePoints.map((value) => `$${value.toFixed(2)}`).join(" / ")
                              : "Unavailable"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <p className="text-[11px] text-slate-500">Rough break-even results</p>
                          <p className="mt-2 text-sm text-slate-300">
                            {projectBreakEvenResults.length > 0
                              ? `${projectBreakEvenResults.map((value) => value.toLocaleString()).join(" / ")} copies`
                              : "Unavailable"}
                          </p>
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
                          {project.postLaunchActuals.actualLaunchPrice !== null && (
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
          )}
        </>
      )}
    </section>
  );
}
