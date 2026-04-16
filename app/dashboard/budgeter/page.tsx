"use client";

import { useState, useMemo, useEffect } from "react";
import { AlertCircle, Zap, X, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  normalizeFinancialProject,
  upsertSavedFinancialProject,
} from "@/lib/financial-projects";

const MAX_MONEY_VALUE = 1_000_000_000;
const MAX_COPIES_VALUE = 1_000_000_000;
const PLANNING_DEFAULTS_STORAGE_KEY = "hm_planning_defaults";
const LAUNCH_BUDGET_DRAFT_STORAGE_KEY = "hm_launch_budget_draft";

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const parseNumericInput = (
  value: string,
  options?: { min?: number; max?: number; fallback?: number }
): number => {
  const parsed = Number.parseFloat((value ?? "").trim());
  const finite = Number.isFinite(parsed) ? parsed : options?.fallback ?? 0;
  const min = options?.min ?? Number.NEGATIVE_INFINITY;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  return clampNumber(finite, min, max);
};

const sanitizePercent = (value: number): number =>
  clampNumber(toFiniteNumber(value, 0), 0, 100);

const sanitizeMoney = (value: number): number =>
  clampNumber(toFiniteNumber(value, 0), 0, MAX_MONEY_VALUE);

const sanitizeCount = (value: number): number =>
  clampNumber(toFiniteNumber(value, 0), 0, MAX_COPIES_VALUE);

// Formatting helpers
const formatCurrency = (value: number): string => {
  const safeValue = toFiniteNumber(value, 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeValue);
};

const formatCurrencyWithDecimals = (value: number): string => {
  const safeValue = toFiniteNumber(value, 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
};

// Calculation helpers
const calculateNetRevenuePerCopy = (
  pricePerCopy: number,
  withholding: number,
  refundRate: number
): number => {
  const safePrice = sanitizeMoney(pricePerCopy);
  const safeWithholding = sanitizePercent(withholding);
  const safeRefundRate = sanitizePercent(refundRate);

  const afterSteamFee = safePrice * (1 - 0.3);
  const afterWithholding = afterSteamFee * (1 - safeWithholding / 100);
  const afterRefunds = afterWithholding * (1 - safeRefundRate / 100);
  return afterRefunds;
};

const calculateBreakEven = (
  totalCost: number,
  netRevenuePerCopy: number
): number | null => {
  const safeTotalCost = sanitizeMoney(totalCost);
  const safeNetRevenuePerCopy = toFiniteNumber(netRevenuePerCopy, 0);
  if (safeNetRevenuePerCopy <= 0) return null;

  const result = Math.ceil(safeTotalCost / safeNetRevenuePerCopy);
  if (!Number.isFinite(result) || result <= 0) return null;
  return sanitizeCount(result);
};

interface ExpenseRow {
  id: string;
  name: string;
  amount: number;
}

interface PlanningReview {
  healthScore: number;
  targetPressure: "Lighter" | "Moderate" | "Heavy" | "Very Heavy";
  costSignal: "Balanced" | "Needs Review" | "Aggressive" | "Uneven";
  insights: string[];
}

type SubscriptionTier = "starter" | "launch-planner";

type PlanningDefaults = {
  withholdingTax: number;
  refundsAssumption: number;
};

type LaunchBudgetDraft = {
  expenses?: unknown;
  refundRate?: unknown;
  withholding?: unknown;
  price1?: unknown;
  price2?: unknown;
  price3?: unknown;
  projectName?: unknown;
  actualLaunchPrice?: unknown;
  actualCopiesSold?: unknown;
  actualRefundRate?: unknown;
  actualGrossRevenue?: unknown;
  actualNetRevenue?: unknown;
};

type SaveProjectFeedback = {
  tone: "success" | "error";
  message: string;
};

const deriveBudgetStatus = (review: PlanningReview): string => {
  if (review.healthScore >= 75 && review.costSignal === "Balanced") {
    return "Balanced";
  }

  if (review.healthScore >= 60) {
    return "Monitor closely";
  }

  return "Needs review";
};

const PLANNING_REVIEW_IMPROVEMENT_REGEX = /roughly (\d+)% improvement/i;

const getPlanningReviewImprovementPercent = (
  review: PlanningReview
): number | null => {
  const matchingInsight = review.insights.find((insight) =>
    PLANNING_REVIEW_IMPROVEMENT_REGEX.test(insight)
  );

  if (!matchingInsight) {
    return null;
  }

  const match = matchingInsight.match(PLANNING_REVIEW_IMPROVEMENT_REGEX);
  return match?.[1] ? Number.parseInt(match[1], 10) : null;
};

const getBudgetHealthSummary = (review: PlanningReview): string => {
  const improvementPercent = getPlanningReviewImprovementPercent(review);

  if (improvementPercent !== null) {
    return `Adjust your pricing to improve budget health and reduce the break-even target by approximately ${improvementPercent}%.`;
  }

  if (review.healthScore < 60) {
    return "Review pricing and costs to improve budget consistency before launch.";
  }

  if (review.healthScore < 75) {
    return "Your plan is workable, but tighter pricing or cost discipline could improve consistency.";
  }

  return "Your pricing and cost assumptions are supporting a relatively stable launch plan.";
};

const getSalesTargetPressureSummary = (review: PlanningReview): string => {
  switch (review.targetPressure) {
    case "Lighter":
      return "Your sales target looks relatively manageable on paper.";
    case "Moderate":
      return "Your sales target is achievable but demands careful planning.";
    case "Heavy":
      return "Your current target will require strong sales execution to stay on track.";
    case "Very Heavy":
      return "Your current target creates significant sales pressure and increases launch risk.";
    default:
      return "Review the break-even target closely before committing to this plan.";
  }
};

const getCostStructureSummary = (review: PlanningReview): string => {
  switch (review.costSignal) {
    case "Balanced":
      return "Your budget is distributed well across key categories.";
    case "Needs Review":
      return "Review the largest categories to improve overall budget efficiency.";
    case "Aggressive":
      return "A few categories are carrying too much of the budget and should be rebalanced.";
    case "Uneven":
      return "Distribute your budget more evenly across key categories to improve efficiency.";
    default:
      return "Review how your budget is distributed across the main cost categories.";
  }
};

const sanitizeStoredText = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const isDraftRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getFriendlyBudgeterLoadError = (
  error: unknown,
  fallbackMessage: string
): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("network") || message.includes("fetch")) {
    return `${fallbackMessage} Check your connection and try again.`;
  }

  return fallbackMessage;
};

const getFriendlySaveProjectError = (
  status: number | null,
  message: string
): string => {
  const normalizedMessage = message.toLowerCase();

  if (status === 401) {
    return "Please sign in again before saving this project.";
  }

  if (status === 403) {
    return "Your account cannot save projects right now.";
  }

  if (status === 429 || normalizedMessage.includes("too many")) {
    return "Too many save attempts. Please wait a moment and try again.";
  }

  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return "We couldn't reach the server to save your project. Please check your connection and try again.";
  }

  if (
    normalizedMessage.includes("invalid save response") ||
    normalizedMessage.includes("unexpected") ||
    normalizedMessage.includes("malformed")
  ) {
    return "The save response was incomplete. Please try saving again.";
  }

  return message.trim() || "We couldn't save your project right now. Please try again.";
};

const generatePlanningReview = (
  totalCost: number,
  expenses: ExpenseRow[],
  pricePoints: number[],
  breakEvenResults: (number | null)[],
  refundRate: number,
  netRevenuesPerCopy: number[]
): PlanningReview => {
  const insights: string[] = [];
  let healthScore = 70;
  const safeTotalCost = sanitizeMoney(totalCost);
  const safeExpenses = expenses.map((expense) => ({
    ...expense,
    amount: sanitizeMoney(expense.amount),
  }));
  const safePricePoints = pricePoints.map((point) => sanitizeMoney(point));
  const safeBreakEvenResults = breakEvenResults.map((be) => {
    if (be === null) return null;
    const value = toFiniteNumber(be, 0);
    return value > 0 ? sanitizeCount(value) : null;
  });
  const safeRefundRate = sanitizePercent(refundRate);
  const safeNetRevenuesPerCopy = netRevenuesPerCopy.map((x) => toFiniteNumber(x, 0));

  // Filter valid break-even results
  const validResults = safeBreakEvenResults.filter((be) => be !== null) as number[];
  const avgBreakEven =
    validResults.length > 0
      ? validResults.reduce((a, b) => a + b, 0) / validResults.length
      : null;

  // 1. Analyze sales target pressure
  let targetPressure: "Lighter" | "Moderate" | "Heavy" | "Very Heavy" =
    "Moderate";
  if (!avgBreakEven) {
    targetPressure = "Very Heavy";
  } else if (avgBreakEven > 50000) {
    targetPressure = "Very Heavy";
    healthScore -= 20;
  } else if (avgBreakEven > 15000) {
    targetPressure = "Heavy";
    healthScore -= 10;
  } else if (avgBreakEven <= 3000) {
    targetPressure = "Lighter";
    healthScore += 10;
  }

  // 2. Analyze cost structure signal
  let costSignal: "Balanced" | "Needs Review" | "Aggressive" | "Uneven" =
    "Balanced";
  if (safeExpenses.length > 2) {
    const sortedExpenses = [...safeExpenses].sort((a, b) => b.amount - a.amount);
    const largestCategory = sortedExpenses[0]?.amount || 0;
    const secondLargest = sortedExpenses[1]?.amount || 0;

    if (largestCategory > safeTotalCost * 0.6) {
      costSignal = "Aggressive";
      healthScore -= 15;
    } else if (largestCategory > safeTotalCost * 0.5) {
      costSignal = "Uneven";
      healthScore -= 8;
    } else if (
      secondLargest > 0 &&
      largestCategory + secondLargest > safeTotalCost * 0.75
    ) {
      costSignal = "Needs Review";
      healthScore -= 5;
    }
  }

  // 3. Check net revenue efficiency
  const positiveNetRevenues = safeNetRevenuesPerCopy.filter((x) => x > 0);
  const avgNetRevenue =
    positiveNetRevenues.length > 0
      ? positiveNetRevenues.reduce((a, b) => a + b, 0) / positiveNetRevenues.length
      : 0;

  if (avgNetRevenue <= 0) {
    healthScore = 20;
    insights.push(
      "Net revenue per copy is zero or negative. Pricing or tax assumptions need adjustment."
    );
  } else if (avgNetRevenue < 3) {
    healthScore -= 10;
    insights.push("Net revenue per copy is low. Consider higher price points or lower costs.");
  } else if (avgNetRevenue > 10) {
    healthScore += 5;
    insights.push("Solid net revenue per copy. Good margin across price points.");
  }

  // 4. Pressure test observations
  if (avgBreakEven && avgBreakEven > 30000) {
    insights.push("Your current sales target is very high relative to total planned spend.");
  } else if (avgBreakEven && avgBreakEven > 10000) {
    insights.push("Your current sales target is substantial relative to total planned spend.");
  }

  // 5. Price point analysis
  if (safePricePoints.length >= 2) {
    const sortedByPrice = [...safeBreakEvenResults]
      .map((be, idx) => ({ price: safePricePoints[idx], be }))
      .filter((x) => x.be !== null)
      .sort((a, b) => (a.price as number) - (b.price as number));

    if (sortedByPrice.length >= 2) {
      const lowPrice = sortedByPrice[0];
      const highPrice = sortedByPrice[sortedByPrice.length - 1];
      if (lowPrice.be !== null && highPrice.be !== null) {
        const reduction = ((1 - highPrice.be / lowPrice.be) * 100).toFixed(0);
        if (parseInt(reduction) > 25) {
          insights.push(
            `A higher price point materially reduces your break-even target (roughly ${reduction}% improvement).`
          );
        }
      }
    }
  }

  // 6. Refund/chargeback observation
  if (safeRefundRate > 12) {
    insights.push(
      "Your refund and chargeback assumption is conservative. Validate against your project type."
    );
  } else if (safeRefundRate < 3) {
    insights.push(
      "Your refund and chargeback assumption is aggressive. Industry rates vary widely."
    );
  }

  // Ensure score is in valid range
  healthScore = Math.max(20, Math.min(95, healthScore));

  return {
    healthScore: Math.round(healthScore),
    targetPressure,
    costSignal,
    insights: insights.slice(0, 5),
  };
};

export default function LaunchBudgetPage() {
  // TODO(security): Resolve tier from trusted billing state server-side; do not trust client-selected tier in production.
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
  const [isLoadingBillingContext, setIsLoadingBillingContext] = useState(true);
  const [billingContextError, setBillingContextError] = useState<string | null>(null);
  const [localDataNotice, setLocalDataNotice] = useState<string | null>(null);
  const isPaidTier = subscriptionTier !== "starter";
  const currentPlanLabel = isLoadingBillingContext
    ? "Checking access..."
    : subscriptionTier === "launch-planner"
      ? "Launch Planner"
      : "Starter";

  useEffect(() => {
    let mounted = true;

    const loadBillingContext = async () => {
      setBillingContextError(null);
      setIsLoadingBillingContext(true);

      try {
        const supabase = createClient();
        if (!supabase) {
          if (mounted) {
            setSubscriptionTier("starter");
            setBillingContextError(
              "We couldn't verify your current plan right now. Budget calculations still work, but save access may be unavailable."
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
          console.error("Failed to load current user for launch budget page", userError);
          setSubscriptionTier("starter");
          setBillingContextError(
            getFriendlyBudgeterLoadError(
              userError,
              "We couldn't verify your current plan right now. Budget calculations still work, but save access may be unavailable."
            )
          );
          return;
        }

        if (!user) {
          setSubscriptionTier("starter");
          return;
        }

        const { data: entitlement, error } = await supabase
          .from("user_entitlements")
          .select("tier, premium_access, billing_state")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error("Failed to load live billing state for launch budget page", error);
          setSubscriptionTier("starter");
          setBillingContextError(
            getFriendlyBudgeterLoadError(
              error,
              "We couldn't verify your current plan right now. Budget calculations still work, but save access may be unavailable."
            )
          );
          return;
        }

        const hasPaidAccess =
          entitlement?.tier === "pro" &&
          entitlement.premium_access === true &&
          entitlement.billing_state === "active";

        setSubscriptionTier(hasPaidAccess ? "launch-planner" : "starter");
      } catch (error) {
        console.error("Failed to load live billing state for launch budget page", error);

        if (!mounted) {
          return;
        }

        setSubscriptionTier("starter");
        setBillingContextError(
          getFriendlyBudgeterLoadError(
            error,
            "We couldn't verify your current plan right now. Budget calculations still work, but save access may be unavailable."
          )
        );
      } finally {
        if (mounted) {
          setIsLoadingBillingContext(false);
        }
      }
    };

    const refresh = () => {
      void loadBillingContext();
    };

    void loadBillingContext();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);

    return () => {
      mounted = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  // Expense inputs - customizable list
  const [expenses, setExpenses] = useState<ExpenseRow[]>([
    { id: "1", name: "Development", amount: 18000 },
    { id: "2", name: "Marketing", amount: 4500 },
    { id: "3", name: "Capsule Art / Key Art", amount: 800 },
    { id: "4", name: "Trailer", amount: 1500 },
    { id: "5", name: "QA / Testing", amount: 1200 },
    { id: "6", name: "Localization", amount: 1000 },
    { id: "7", name: "Music / Audio", amount: 600 },
    { id: "8", name: "Contractors / Freelancers", amount: 2500 },
    { id: "9", name: "Other", amount: 700 },
  ]);

  const [refundRate, setRefundRate] = useState("8");
  const [withholding, setWithholding] = useState("30");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(PLANNING_DEFAULTS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<PlanningDefaults>;
      const nextWithholding = parseNumericInput(String(parsed.withholdingTax ?? ""), {
        min: 0,
        max: 100,
        fallback: 30,
      });
      const nextRefunds = parseNumericInput(String(parsed.refundsAssumption ?? ""), {
        min: 0,
        max: 100,
        fallback: 8,
      });

      setWithholding(nextWithholding.toString());
      setRefundRate(nextRefunds.toString());
    } catch {
      setLocalDataNotice((current) =>
        current ?? "Some saved planning defaults could not be restored, so built-in defaults were used."
      );
      // Keep in-page defaults if stored defaults are invalid.
    }
  }, []);

  // Price points
  const [price1, setPrice1] = useState("12.99");
  const [price2, setPrice2] = useState("16.99");
  const [price3, setPrice3] = useState("19.99");
  const [projectName, setProjectName] = useState("Launch Budget Project");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [saveProjectFeedback, setSaveProjectFeedback] =
    useState<SaveProjectFeedback | null>(null);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  // Post-launch actuals
  const [actualLaunchPrice, setActualLaunchPrice] = useState("1");
  const [actualCopiesSold, setActualCopiesSold] = useState("");
  const [actualRefundRate, setActualRefundRate] = useState("");
  const [actualGrossRevenue, setActualGrossRevenue] = useState("");
  const [actualNetRevenue, setActualNetRevenue] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(LAUNCH_BUDGET_DRAFT_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as LaunchBudgetDraft;
      if (!isDraftRecord(parsed)) {
        setLocalDataNotice((current) =>
          current ?? "Your saved budget draft could not be restored, so the page started with default values."
        );
        return;
      }

      if (Array.isArray(parsed.expenses)) {
        const restoredExpenses = parsed.expenses.map((expense, index) => {
          const record = isDraftRecord(expense) ? expense : {};

          return {
            id: sanitizeStoredText(record.id, String(index + 1)),
            name: sanitizeStoredText(record.name, ""),
            amount: parseNumericInput(String(record.amount ?? "0"), {
              min: 0,
              max: MAX_MONEY_VALUE,
              fallback: 0,
            }),
          };
        });

        setExpenses(restoredExpenses);
      }

      setRefundRate(sanitizeStoredText(parsed.refundRate, "8"));
      setWithholding(sanitizeStoredText(parsed.withholding, "30"));
      setPrice1(sanitizeStoredText(parsed.price1, "12.99"));
      setPrice2(sanitizeStoredText(parsed.price2, "16.99"));
      setPrice3(sanitizeStoredText(parsed.price3, "19.99"));
      setProjectName(sanitizeStoredText(parsed.projectName, "Launch Budget Project"));
      setActualLaunchPrice(sanitizeStoredText(parsed.actualLaunchPrice, "1"));
      setActualCopiesSold(sanitizeStoredText(parsed.actualCopiesSold, ""));
      setActualRefundRate(sanitizeStoredText(parsed.actualRefundRate, ""));
      setActualGrossRevenue(sanitizeStoredText(parsed.actualGrossRevenue, ""));
      setActualNetRevenue(sanitizeStoredText(parsed.actualNetRevenue, ""));
    } catch {
      setLocalDataNotice((current) =>
        current ?? "Your saved budget draft could not be restored, so the page started with default values."
      );
      // Ignore invalid draft data and keep current in-page defaults.
    } finally {
      setHasLoadedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedDraft) return;

    const draft: LaunchBudgetDraft = {
      expenses,
      refundRate,
      withholding,
      price1,
      price2,
      price3,
      projectName,
      actualLaunchPrice,
      actualCopiesSold,
      actualRefundRate,
      actualGrossRevenue,
      actualNetRevenue,
    };

    try {
      window.localStorage.setItem(
        LAUNCH_BUDGET_DRAFT_STORAGE_KEY,
        JSON.stringify(draft)
      );
    } catch {
      setLocalDataNotice((current) =>
        current ?? "Changes can't be saved locally in this browser right now, but you can keep editing."
      );
      // Ignore storage write failures so editing the form never breaks the page.
    }
  }, [
    actualCopiesSold,
    actualGrossRevenue,
    actualLaunchPrice,
    actualNetRevenue,
    actualRefundRate,
    expenses,
    hasLoadedDraft,
    price1,
    price2,
    price3,
    projectName,
    refundRate,
    withholding,
  ]);

  // Add new expense
  const addExpense = () => {
    const newId = Math.max(...expenses.map((e) => parseInt(e.id)), 0) + 1;
    setExpenses([
      ...expenses,
      { id: newId.toString(), name: "", amount: 0 },
    ]);
  };

  // Update expense
  const updateExpense = (id: string, field: "name" | "amount", value: string) => {
    setExpenses(
      expenses.map((exp) =>
        exp.id === id
          ? {
              ...exp,
              [field]:
                field === "amount"
                  ? parseNumericInput(value, { min: 0, max: MAX_MONEY_VALUE, fallback: 0 })
                  : value,
            }
          : exp
      )
    );
  };

  // Remove expense
  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id));
  };

  // Calculate results
  const calculations = useMemo(() => {
    const parseMoneyInput = (val: string) =>
      parseNumericInput(val, { min: 0, max: MAX_MONEY_VALUE, fallback: 0 });
    const parsePercentInput = (val: string) =>
      parseNumericInput(val, { min: 0, max: 100, fallback: 0 });

    const totalCost = expenses.reduce((sum, exp) => sum + sanitizeMoney(exp.amount), 0);

    const pricePoints = [parseMoneyInput(price1), parseMoneyInput(price2), parseMoneyInput(price3)];
    const witholdingRate = parsePercentInput(withholding);
    const refundRateNum = parsePercentInput(refundRate);

    const netRevenuesPerCopy = pricePoints.map((price) =>
      calculateNetRevenuePerCopy(price, witholdingRate, refundRateNum)
    );

    const breakEvenResults = pricePoints.map((price, idx) =>
      calculateBreakEven(totalCost, netRevenuesPerCopy[idx])
    );

    const planningReview = generatePlanningReview(
      totalCost,
      expenses,
      pricePoints,
      breakEvenResults,
      refundRateNum,
      netRevenuesPerCopy
    );

    return {
      totalCost,
      pricePoints,
      netRevenuesPerCopy,
      breakEvenResults,
      witholdingRate,
      refundRateNum,
      planningReview,
    };
  }, [expenses, refundRate, withholding, price1, price2, price3]);

  const activePriceCount = isPaidTier ? 3 : 1;
  const visiblePricePoints = calculations.pricePoints.slice(0, activePriceCount);
  const trimmedProjectName = projectName.trim();
  const calculationNotice =
    calculations.totalCost <= 0
      ? "Add at least one planned cost above $0 to calculate a break-even target."
      : visiblePricePoints.some((price) => price <= 0)
        ? "Enter a launch price above $0 to calculate a break-even target."
        : calculations.netRevenuesPerCopy
            .slice(0, activePriceCount)
            .some((value) => value <= 0)
          ? "Adjust your pricing, refunds, or withholding assumptions so estimated net revenue per copy stays above $0."
          : null;

  const postLaunchSummary = useMemo(() => {
    const launchPriceIdx = Number(actualLaunchPrice) - 1;
    if (launchPriceIdx < 0 || launchPriceIdx > 2) return null;

    const plannedBreakEven = calculations.breakEvenResults[launchPriceIdx];
    const plannedNetRevenuePerCopy = toFiniteNumber(calculations.netRevenuesPerCopy[launchPriceIdx], 0);
    const plannedRefundRate = sanitizePercent(calculations.refundRateNum);

    const hasActualRefundInput = actualRefundRate.trim() !== "";
    const hasActualGrossInput = actualGrossRevenue.trim() !== "";
    const hasActualNetInput = actualNetRevenue.trim() !== "";

    const actualCopies = parseNumericInput(actualCopiesSold, { min: 0, max: MAX_COPIES_VALUE, fallback: 0 });
    const actualRefunds = parseNumericInput(actualRefundRate, { min: 0, max: 100, fallback: 0 });
    const grossInput = parseNumericInput(actualGrossRevenue, { min: 0, max: MAX_MONEY_VALUE, fallback: 0 });
    const netInput = parseNumericInput(actualNetRevenue, { min: 0, max: MAX_MONEY_VALUE, fallback: 0 });
    const launchPrice = sanitizeMoney(calculations.pricePoints[launchPriceIdx]);

    const actualGross = hasActualGrossInput ? grossInput : sanitizeMoney(actualCopies * launchPrice);
    const estimatedActualNet =
      actualGross *
      (1 - 0.3) *
      (1 - sanitizePercent(calculations.witholdingRate) / 100) *
      (1 - actualRefunds / 100);
    const resolvedActualNet = hasActualNetInput ? netInput : sanitizeMoney(estimatedActualNet);

    if (actualCopies <= 0) {
      return null;
    }

    const differenceVsPlan = plannedBreakEven ? actualCopies - plannedBreakEven : null;

    let summary = "Close to plan";
    if (plannedBreakEven) {
      if (actualCopies >= plannedBreakEven * 1.15) summary = "Ahead of plan";
      else if (actualCopies <= plannedBreakEven * 0.85) summary = "Behind plan";
    }

    const bullets: string[] = [];
    if (plannedBreakEven) {
      if (actualCopies < plannedBreakEven) {
        bullets.push("Actual copies sold came in below the original rough break-even target.");
      } else {
        bullets.push("Actual copies sold exceeded the original rough break-even target.");
      }
    }
    if (hasActualRefundInput) {
      if (actualRefunds > plannedRefundRate) {
        bullets.push("Actual refunds and chargebacks were higher than planned.");
      } else if (actualRefunds < plannedRefundRate) {
        bullets.push("Actual refunds and chargebacks were lower than planned.");
      }
    }
    if (resolvedActualNet < plannedNetRevenuePerCopy * actualCopies) {
      bullets.push("Actual net revenue landed below the original planning estimate.");
    } else {
      bullets.push("Actual net revenue was close to or above the original planning estimate.");
    }
    if (summary === "Ahead of plan") {
      bullets.push("The original plan appears conservative for this launch window.");
    } else if (summary === "Behind plan") {
      bullets.push("The original plan appears optimistic versus early actuals.");
    }

    return {
      actualLaunchPricePoint: launchPriceIdx + 1,
      actualLaunchPrice: launchPrice,
      plannedBreakEven,
      actualCopies,
      differenceVsPlan,
      plannedRefundRate,
      actualRefunds: hasActualRefundInput ? actualRefunds : null,
      plannedNetRevenuePerCopy,
      actualGrossRevenue: sanitizeMoney(actualGross),
      actualNetRevenue: sanitizeMoney(resolvedActualNet),
      summary,
      bullets: bullets.slice(0, 4),
    };
  }, [
    actualLaunchPrice,
    actualCopiesSold,
    actualRefundRate,
    actualGrossRevenue,
    actualNetRevenue,
    calculations.breakEvenResults,
    calculations.netRevenuesPerCopy,
    calculations.pricePoints,
    calculations.refundRateNum,
    calculations.witholdingRate,
  ]);

  const saveProjectDisabled =
    isLoadingBillingContext ||
    !isPaidTier ||
    isSavingProject ||
    trimmedProjectName.length === 0 ||
    calculations.totalCost <= 0 ||
    calculations.breakEvenResults
      .slice(0, activePriceCount)
      .some((result) => result === null);

  const handleSaveProject = async () => {
    if (isSavingProject || isLoadingBillingContext) {
      return;
    }

    setSaveProjectFeedback(null);

    if (!trimmedProjectName) {
      setSaveProjectFeedback({
        tone: "error",
        message: "Enter a project name before saving.",
      });
      return;
    }

    if (!isPaidTier) {
      setSaveProjectFeedback({
        tone: "error",
        message:
          "Project saving is currently available on Launch Planner while billing access is enabled.",
      });
      return;
    }

    const resolvedBreakEvenResults = calculations.breakEvenResults
      .slice(0, activePriceCount)
      .filter((result): result is number => result !== null);

    if (resolvedBreakEvenResults.length !== activePriceCount) {
      setSaveProjectFeedback({
        tone: "error",
        message: "Enter valid price points and costs before saving this project.",
      });
      return;
    }

    const project = normalizeFinancialProject({
      name: trimmedProjectName,
      totalPlannedSpend: calculations.totalCost,
      mainPricePoint: calculations.pricePoints[0] ?? 0,
      roughBreakEvenCopies: resolvedBreakEvenResults[0] ?? 0,
      budgetStatus: deriveBudgetStatus(calculations.planningReview),
      expenses: expenses.map((expense) => ({
        name: expense.name,
        amount: expense.amount,
      })),
      platformFee: 30,
      withholdingTax: calculations.witholdingRate,
      refundsAssumption: calculations.refundRateNum,
      pricePoints: calculations.pricePoints.slice(0, activePriceCount),
      breakEvenResults: resolvedBreakEvenResults,
      netRevenuePerCopy: calculations.netRevenuesPerCopy.slice(0, activePriceCount),
      planningReview: {
        healthScore: calculations.planningReview.healthScore,
        salesTargetPressure: calculations.planningReview.targetPressure,
        costStructureSignal: calculations.planningReview.costSignal,
        insights: calculations.planningReview.insights,
      },
      postLaunchActuals:
        postLaunchSummary
          ? {
              actualLaunchPricePoint: postLaunchSummary.actualLaunchPricePoint,
              actualLaunchPrice: postLaunchSummary.actualLaunchPrice,
              actualCopiesSold: postLaunchSummary.actualCopies,
              actualRefunds: postLaunchSummary.actualRefunds,
              actualGrossRevenue: postLaunchSummary.actualGrossRevenue,
              actualNetRevenue: postLaunchSummary.actualNetRevenue,
              comparisonSummary: postLaunchSummary.summary,
              comparisonBullets: postLaunchSummary.bullets,
            }
          : undefined,
    });

    setIsSavingProject(true);

    try {
      const response = await fetch("/api/save-financial-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(project),
      });

      const rawResponse = await response.text();
      let result: {
        success?: boolean;
        error?: string;
        project?: unknown;
      } | null = null;

      if (rawResponse) {
        try {
          result = JSON.parse(rawResponse) as {
            success?: boolean;
            error?: string;
            project?: unknown;
          };
        } catch {
          result = null;
        }
      }

      if (!response.ok || !result?.success || !isDraftRecord(result?.project)) {
        const responseMessage =
          result?.error ??
          (!isDraftRecord(result?.project) ? "invalid save response" : rawResponse.trim());

        console.error("Save Project request failed", {
          responseBody: rawResponse,
          status: response.status,
        });
        setSaveProjectFeedback({
          tone: "error",
          message: getFriendlySaveProjectError(response.status, responseMessage),
        });
        return;
      }

      const savedProject = normalizeFinancialProject(result.project as Record<string, unknown>);
      upsertSavedFinancialProject(savedProject);
      setProjectName(savedProject.name);
      setSaveProjectFeedback({
        tone: "success",
        message: "Project saved successfully. Your current saved budget has been updated.",
      });
    } catch (error) {
      setSaveProjectFeedback({
        tone: "error",
        message: getFriendlySaveProjectError(
          null,
          error instanceof Error ? error.message : ""
        ),
      });
    } finally {
      setIsSavingProject(false);
    }
  };

  return (
    <section className="space-y-8">
      {/* SECTION 1: SUBSCRIPTION TIER INFO - LIGHTWEIGHT */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-3">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Project Limits by Plan
        </p>
        <div className="mb-4 grid grid-cols-1 gap-2 md:max-w-xs">
          <p className="text-base font-bold text-slate-200">
            <span className="text-slate-400">Current plan:</span>{" "}
            <span className="text-white">{currentPlanLabel}</span>
          </p>
        </div>
        {billingContextError && (
          <p className="mb-4 text-xs text-amber-300" role="alert">
            {billingContextError}
          </p>
        )}
        {localDataNotice && (
          <p className="mb-4 text-xs text-amber-300" role="status">
            {localDataNotice}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-400">Starter</p>
            <p className="text-slate-600">Starter includes calculator access only</p>
          </div>
          <div>
            <p className="font-semibold text-slate-400">Launch Planner</p>
            <p className="text-slate-600">Launch Planner includes 1 active saved project budget</p>
          </div>
          <div>
            <p className="font-semibold text-slate-400">More Plans</p>
            <p className="text-slate-600">More plans coming soon</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black text-white">Save Project</h2>
            <p className="mt-2 text-sm text-slate-400">
              Save the current launch budget inputs and break-even snapshot to your account.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {isLoadingBillingContext
                ? "Checking your plan access before project saving is enabled."
                : isPaidTier
                ? "Launch Planner includes 1 saved project. Saving here updates that project with your latest inputs."
                : "Project saving is not included on Starter."}
            </p>
          </div>

          <div className="w-full max-w-xl">
            <label htmlFor="project-name" className="mb-2 block text-sm font-semibold text-slate-300">
              Project Name
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="project-name"
                type="text"
                placeholder="e.g. Hollow Metric launch plan"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                disabled={isSavingProject}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="button"
                onClick={() => {
                  void handleSaveProject();
                }}
                disabled={saveProjectDisabled}
                className={[
                  "rounded-2xl px-5 py-3 text-sm font-semibold transition-all sm:min-w-36",
                  saveProjectDisabled
                    ? "cursor-not-allowed border border-slate-800 bg-slate-900/60 text-slate-500"
                    : "border border-blue-600/30 bg-blue-600/10 text-blue-300 hover:bg-blue-600/15",
                ].join(" ")}
              >
                {isSavingProject ? "Saving..." : isLoadingBillingContext ? "Checking access..." : "Save Project"}
              </button>
            </div>

            {saveProjectFeedback && (
              <p
                role={saveProjectFeedback.tone === "error" ? "alert" : "status"}
                className={[
                  "mt-3 text-sm",
                  saveProjectFeedback.tone === "success"
                    ? "text-emerald-300"
                    : "text-amber-300",
                ].join(" ")}
              >
                {saveProjectFeedback.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: EXPENSE INPUTS - FLEXIBLE */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <h2 className="text-2xl font-black text-white mb-6">Launch Cost Inputs</h2>

        <div className="space-y-4 mb-6">
          {expenses.map((expense) => (
            <div key={expense.id} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Expense Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Development"
                  value={expense.name}
                  onChange={(e) => updateExpense(expense.id, "name", e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Cost
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={expense.amount}
                  onChange={(e) => updateExpense(expense.id, "amount", e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
                />
              </div>
              <button
                onClick={() => removeExpense(expense.id)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-slate-400 transition-all hover:border-red-600/30 hover:bg-red-950/30 hover:text-red-400 sm:w-auto"
                title="Remove expense"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addExpense}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-600/30 bg-blue-600/10 px-4 py-3 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-600/15 sm:w-auto"
        >
          <Plus size={16} /> Add Expense
        </button>

        <div className="rounded-2xl bg-blue-600/10 border border-blue-600/20 p-4">
          <p className="text-lg font-black text-white">Total Planned Spend</p>
          <p className="text-4xl font-black text-blue-400 mt-2">
            {formatCurrency(calculations.totalCost)}
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="refund-rate" className="block text-sm font-semibold text-slate-300 mb-2">
            Estimated Refunds & Chargebacks (%)
          </label>
          <input
            id="refund-rate"
            type="number"
            placeholder="e.g. 8"
            value={refundRate}
            onChange={(e) => setRefundRate(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
          />
          <p className="text-xs text-slate-500 mt-2">
            Use your own estimate. Many developers include a refund and chargeback buffer in planning, but real rates vary by game, pricing, region, quality, and launch conditions.
          </p>
        </div>
      </div>

      {/* SECTION 3: PLATFORM + TAX ASSUMPTIONS */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <h2 className="text-2xl font-black text-white mb-6">Platform and Tax Assumptions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl bg-slate-800/30 p-4 border border-slate-800">
            <p className="text-sm font-semibold text-slate-400 mb-1">Steam Platform Fee</p>
            <p className="text-3xl font-black text-white">30%</p>
          </div>

          <div className="rounded-2xl bg-slate-800/30 p-4 border border-slate-800">
            <p className="text-sm font-semibold text-slate-400 mb-1">U.S. Withholding Tax (Typical)</p>
            <p className="text-3xl font-black text-white">30%</p>
            <p className="text-xs text-slate-500 mt-2">May vary by treaty</p>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="withholding-rate" className="block text-sm font-semibold text-slate-300 mb-2">
            Estimated U.S. Withholding Tax Rate (%)
          </label>
          <input
            id="withholding-rate"
            type="number"
            placeholder="e.g. 30"
            value={withholding}
            onChange={(e) => setWithholding(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
          />
        </div>

        <div className="rounded-2xl bg-amber-600/10 border border-amber-600/20 p-4">
          <p className="text-xs font-black text-amber-200 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
            <AlertCircle size={14} /> Planning Estimate Only
          </p>
          <p className="text-xs leading-6 text-amber-100/80">
            This tool is a planning estimate. Final tax treatment varies by treaty status, country, documentation, and income type. Users should verify final calculations with a qualified tax professional.
          </p>
        </div>
      </div>

      {/* SECTION 4: PRICE POINT INPUTS */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <h2 className="text-2xl font-black text-white mb-6">Price Point Comparison</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          {[
            {
              label: "Price Point 1",
              placeholder: "e.g. 12.99",
              value: price1,
              onChange: setPrice1,
            },
            {
              label: "Price Point 2",
              placeholder: "e.g. 16.99",
              value: price2,
              onChange: setPrice2,
            },
            {
              label: "Price Point 3",
              placeholder: "e.g. 19.99",
              value: price3,
              onChange: setPrice3,
            },
          ].slice(0, activePriceCount).map((field, idx) => (
            <div key={idx}>
              <label htmlFor={`price-${idx}`} className="block text-sm font-semibold text-slate-300 mb-2">
                {field.label}
              </label>
              <input
                id={`price-${idx}`}
                type="number"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                step="0.01"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
              />
            </div>
          ))}
        </div>

        {!isPaidTier && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 mb-4">
            <p className="text-sm font-semibold text-slate-200">Price Point 2 and 3 are locked on Starter</p>
            <p className="text-xs text-slate-400 mt-1">
              Multiple price points are not included on Starter.
            </p>
          </div>
        )}

        <p className="text-sm text-slate-400">
          {isPaidTier
            ? "Compare up to three launch prices and see how each one changes your break-even target."
            : "Starter includes one launch price and a break-even estimate."}
        </p>
      </div>

      {/* SECTION 5 & 6: RESULTS AREA */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
        <h2 className="text-2xl font-black text-white mb-6">Break-Even Results</h2>

        {calculationNotice && (
          <div className="mb-6 rounded-2xl border border-amber-600/20 bg-amber-600/10 p-4">
            <p className="text-sm text-amber-100" role="alert">
              {calculationNotice}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {visiblePricePoints.map((price, idx) => {
            const netRevenue = calculations.netRevenuesPerCopy[idx];
            const breakEven = calculations.breakEvenResults[idx];

            return (
              <div
                key={idx}
                className="rounded-2xl border border-blue-600/30 bg-blue-600/10 p-6"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-blue-300 font-black mb-3">
                  Price Point {idx + 1}
                </p>

                <div className="mb-4">
                  <p className="text-sm text-slate-400 mb-1">Launch Price</p>
                  <p className="text-3xl font-black text-white">${price.toFixed(2)}</p>
                </div>

                <div className="mb-4 pb-4 border-b border-blue-600/20">
                  <p className="text-sm text-slate-400 mb-1">Estimated Net Revenue Per Copy</p>
                  {netRevenue > 0 ? (
                    <p className="text-2xl font-black text-blue-400">
                      {formatCurrencyWithDecimals(netRevenue)}
                    </p>
                  ) : (
                    <p className="text-sm font-black text-red-400">Invalid (net ≤ $0)</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-2">Rough Break-Even Copies Needed</p>
                  {breakEven ? (
                    <>
                      <p className="text-4xl font-black text-blue-500">
                        {breakEven.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">copies</p>
                    </>
                  ) : (
                    <p className="text-sm font-black text-red-400">Unable to calculate</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-slate-800/30 border border-slate-700 p-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] mb-2 flex items-center gap-2">
            <AlertCircle size={14} /> Planning Estimates
          </p>
          <p className="text-xs leading-6 text-slate-400">
            These figures are planning estimates. Real outcomes vary based on regional pricing, tax treatment, refunds, discounts, and platform factors.
          </p>
        </div>
      </div>

      {/* SECTION 7: PLANNING REVIEW */}
      {isPaidTier ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white mb-6">Planning Review</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 border border-emerald-600/30 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 font-black mb-2">
              Budget Health Score
            </p>
            <p className="text-5xl font-black text-emerald-400">
              {calculations.planningReview.healthScore}
            </p>
            <p className="text-xs text-emerald-200/60 mt-2">out of 100</p>
            <p className="mt-3 text-xs leading-5 text-emerald-200/60">
              {getBudgetHealthSummary(calculations.planningReview)}
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-600/5 border border-amber-600/30 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300 font-black mb-2">
              Sales Target Pressure
            </p>
            <p className="text-3xl font-black text-amber-400">
              {calculations.planningReview.targetPressure}
            </p>
            <p className="mt-3 text-xs leading-5 text-amber-200/60">
              {getSalesTargetPressureSummary(calculations.planningReview)}
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-600/30 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300 font-black mb-2">
              Cost Structure Signal
            </p>
            <p className="text-2xl font-black text-blue-400">
              {calculations.planningReview.costSignal}
            </p>
            <p className="mt-3 text-xs leading-5 text-blue-200/60">
              {getCostStructureSummary(calculations.planningReview)}
            </p>
          </div>
        </div>

          <div className="rounded-2xl bg-slate-800/30 border border-slate-700 p-6">
            <p className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" /> Planning Observations
            </p>
            <ul className="space-y-3">
              {calculations.planningReview.insights.length > 0 ? (
                calculations.planningReview.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-yellow-400 font-black mt-1">•</span>
                    <span className="text-sm text-slate-300">{insight}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-400">
                    Add your cost assumptions and price points to see planning observations.
                </li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-6 opacity-90 sm:p-8">
          <h2 className="text-2xl font-black text-white mb-3">Planning Review</h2>
          <p className="text-slate-400 mb-4">
            Planning Review is not included on Starter.
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Upgrade to Launch Planner to unlock this section.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-slate-500 text-sm">Budget Health Score</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-slate-500 text-sm">Sales Target Pressure</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-slate-500 text-sm">Cost Structure Signal</div>
          </div>
        </div>
      )}

      {/* SECTION 8: POST-LAUNCH ACTUALS */}
      {isPaidTier ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white mb-2">Post-Launch Actuals</h2>
          <p className="text-slate-400 mb-6">
            Compare your original launch plan against real sales results.
          </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="actual-launch-price" className="block text-sm font-semibold text-slate-300 mb-2">
              Actual Launch Price Used
            </label>
            <select
              id="actual-launch-price"
              value={actualLaunchPrice}
              onChange={(e) => setActualLaunchPrice(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
            >
              <option value="">-- None yet --</option>
              <option value="1">Price Point 1 (${calculations.pricePoints[0].toFixed(2)})</option>
              <option value="2">Price Point 2 (${calculations.pricePoints[1].toFixed(2)})</option>
              <option value="3">Price Point 3 (${calculations.pricePoints[2].toFixed(2)})</option>
            </select>
          </div>

          <div>
            <label htmlFor="actual-copies" className="block text-sm font-semibold text-slate-300 mb-2">
              Actual Copies Sold
            </label>
            <input
              id="actual-copies"
              type="number"
              placeholder="e.g. 5000"
              value={actualCopiesSold}
              onChange={(e) => setActualCopiesSold(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
            />
          </div>

          <div>
            <label htmlFor="actual-refund-rate" className="block text-sm font-semibold text-slate-300 mb-2">
              Actual Refunds & Chargebacks (%)
            </label>
            <input
              id="actual-refund-rate"
              type="number"
              placeholder="e.g. 6"
              value={actualRefundRate}
              onChange={(e) => setActualRefundRate(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
            />
          </div>

          <div>
            <label htmlFor="actual-gross-revenue" className="block text-sm font-semibold text-slate-300 mb-2">
              Actual Gross Revenue
            </label>
            <input
              id="actual-gross-revenue"
              type="number"
              placeholder="e.g. 64950"
              value={actualGrossRevenue}
              onChange={(e) => setActualGrossRevenue(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
            />
          </div>

          <div>
            <label htmlFor="actual-net-revenue" className="block text-sm font-semibold text-slate-300 mb-2">
              Actual Net Revenue
            </label>
            <input
              id="actual-net-revenue"
              type="number"
              placeholder="e.g. 35000"
              value={actualNetRevenue}
              onChange={(e) => setActualNetRevenue(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-all"
            />
          </div>
        </div>

          <p className="text-xs text-slate-500 mb-6">
            Use this section to track actual launch results and compare them against your plan.
          </p>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6">
            <h3 className="text-xl font-black text-white mb-4">Plan vs Actual Summary</h3>
            {postLaunchSummary ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-400 mb-1">Planned rough break-even copies</p>
                    <p className="text-xl font-black text-white">{postLaunchSummary.plannedBreakEven ? postLaunchSummary.plannedBreakEven.toLocaleString() : "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-400 mb-1">Actual copies sold</p>
                    <p className="text-xl font-black text-white">{postLaunchSummary.actualCopies.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-400 mb-1">Difference vs plan</p>
                    <p className="text-xl font-black text-blue-400">
                      {postLaunchSummary.differenceVsPlan === null
                        ? "—"
                        : `${postLaunchSummary.differenceVsPlan > 0 ? "+" : ""}${postLaunchSummary.differenceVsPlan.toLocaleString()}`}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-400 mb-1">Planned refunds/chargebacks</p>
                    <p className="text-xl font-black text-white">{postLaunchSummary.plannedRefundRate.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-400 mb-1">Actual refunds/chargebacks</p>
                    <p className="text-xl font-black text-white">
                      {postLaunchSummary.actualRefunds === null ? "—" : `${postLaunchSummary.actualRefunds.toFixed(1)}%`}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-400 mb-1">Planned net revenue per copy</p>
                    <p className="text-xl font-black text-white">{formatCurrencyWithDecimals(postLaunchSummary.plannedNetRevenuePerCopy)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 md:col-span-2">
                    <p className="text-xs text-slate-400 mb-1">Actual net revenue</p>
                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(postLaunchSummary.actualNetRevenue)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-black mb-2">Comparison Read</p>
                  <p className="text-sm font-semibold text-blue-300 mb-3">{postLaunchSummary.summary}</p>
                  <ul className="space-y-2">
                    {postLaunchSummary.bullets.map((bullet) => (
                      <li key={bullet} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Enter actual copies sold and choose the launch price used to compare your actual results against your plan.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-8 opacity-90">
          <h2 className="text-2xl font-black text-white mb-3">Post-Launch Actuals</h2>
          <p className="text-slate-400">
            Post-Launch Actuals is not included on Starter.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Upgrade to Launch Planner to unlock this section.
          </p>
        </div>
      )}

    </section>
  );
}
