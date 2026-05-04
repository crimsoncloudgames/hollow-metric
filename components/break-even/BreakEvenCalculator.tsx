"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@/instrumentation-client";
import posthog from "posthog-js";
import {
  calculateBreakEven,
  calculateRevenueBreakdown,
} from "@/lib/break-even/calculateBreakEven";

const PENDING_BREAK_EVEN_CALCULATION_STORAGE_KEY =
  "hm_pending_break_even_calculation";
const STEAM_PLATFORM_FEE_PERCENT = 30;

const parseNumericInput = (
  value: string,
  options?: { min?: number; max?: number; fallback?: number }
): number => {
  const parsed = Number.parseFloat((value ?? "").trim());
  const finite = Number.isFinite(parsed) ? parsed : options?.fallback ?? 0;
  const min = options?.min ?? Number.NEGATIVE_INFINITY;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  return Math.min(max, Math.max(min, finite));
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyWithDecimals = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface BreakEvenCalculatorProps {
  mode: "public" | "dashboard";
}

export default function BreakEvenCalculator({ mode }: BreakEvenCalculatorProps) {
  const router = useRouter();
  const calculatorRef = useRef<HTMLDivElement | null>(null);

  const [developmentCost, setDevelopmentCost] = useState("18000");
  const [marketingCost, setMarketingCost] = useState("4500");
  const [otherCosts, setOtherCosts] = useState("700");
  const [price, setPrice] = useState("12.99");
  const [withholdingTax, setWithholdingTax] = useState("0");
  const [refundRate, setRefundRate] = useState("8");
  const [publisherSplitPercent, setPublisherSplitPercent] = useState("0");
  const [showResults, setShowResults] = useState(mode === "dashboard");
  const [hasTrackedResult, setHasTrackedResult] = useState(false);

  const totals = useMemo(() => {
    const development = parseNumericInput(developmentCost, {
      min: 0,
      max: 1_000_000_000,
      fallback: 0,
    });
    const marketing = parseNumericInput(marketingCost, {
      min: 0,
      max: 1_000_000_000,
      fallback: 0,
    });
    const other = parseNumericInput(otherCosts, {
      min: 0,
      max: 1_000_000_000,
      fallback: 0,
    });
    const pricePoint = parseNumericInput(price, {
      min: 0,
      max: 1_000_000_000,
      fallback: 0,
    });
    const refundPercent = parseNumericInput(refundRate, {
      min: 0,
      max: 100,
      fallback: 0,
    });
    const withholdingPercent = parseNumericInput(withholdingTax, {
      min: 0,
      max: 100,
      fallback: 0,
    });
    const publisherPercent = parseNumericInput(publisherSplitPercent, {
      min: 0,
      max: 100,
      fallback: 0,
    });

    const totalCost = development + marketing + other;
    const revenueBreakdown = calculateRevenueBreakdown(
      pricePoint,
      withholdingPercent,
      refundPercent,
      publisherPercent,
      STEAM_PLATFORM_FEE_PERCENT
    );
    const breakEvenCopies = calculateBreakEven(totalCost, revenueBreakdown.developerNetPerCopy);

    return {
      development,
      marketing,
      other,
      totalCost,
      pricePoint,
      withholdingPercent,
      refundPercent,
      publisherPercent,
      revenueBreakdown,
      breakEvenCopies,
    };
  }, [developmentCost, marketingCost, otherCosts, price, withholdingTax, refundRate, publisherSplitPercent]);

  const resultUnavailable =
    totals.totalCost <= 0 ||
    totals.pricePoint <= 0 ||
    totals.revenueBreakdown.developerNetPerCopy <= 0;

  const handleCreateAccount = () => {
    try {
      const payload = {
        developmentCost: totals.development,
        marketingCost: totals.marketing,
        otherCosts: totals.other,
        price: totals.pricePoint,
        platformFeePercent: STEAM_PLATFORM_FEE_PERCENT,
        refundRate: totals.refundPercent,
        withholdingTax: totals.withholdingPercent,
        publisherSplitPercent: totals.publisherPercent,
        createdAt: new Date().toISOString(),
      };
      window.localStorage.setItem(
        PENDING_BREAK_EVEN_CALCULATION_STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch {
      // Ignore local storage write failure; still navigate to signup.
    }

    const returnPath = "/dashboard/budgeter";
    router.push(`/signup?returnPath=${encodeURIComponent(returnPath)}`);
  };

  const getTotalCostRange = (totalCost: number): string => {
    if (totalCost <= 1000) return "0-1k";
    if (totalCost <= 5000) return "1k-5k";
    if (totalCost <= 15000) return "5k-15k";
    if (totalCost <= 50000) return "15k-50k";
    return "50k+";
  };

  const getBreakEvenCopiesRange = (copies: number | null): string => {
    if (copies === null) return "invalid";
    if (copies <= 500) return "0-500";
    if (copies <= 2000) return "501-2k";
    if (copies <= 5000) return "2k-5k";
    if (copies <= 10000) return "5k-10k";
    return "10k+";
  };

  const handleShowResult = () => {
    setShowResults(true);

    if (mode !== "public" || hasTrackedResult) {
      return;
    }

    setHasTrackedResult(true);

    const payload = {
      total_cost_range: getTotalCostRange(totals.totalCost),
      game_price: totals.pricePoint,
      refund_rate: totals.refundPercent,
      withholding_rate: totals.withholdingPercent,
      publisher_split: totals.publisherPercent,
      break_even_copies_range: getBreakEvenCopiesRange(totals.breakEvenCopies),
    };

    void fetch("/api/landing-calculator/completed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Tracking failures are intentionally ignored.
    });
  };

  const handleContinueEditing = () => {
    calculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const shouldBlurResults = mode === "public" && !showResults;

  return (
    <div ref={calculatorRef} className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-[0_0_36px_rgba(15,23,42,0.24)] backdrop-blur-xl">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_0.65fr] lg:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Calculator Preview</p>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Calculate your break-even point before you launch</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            No account needed. Enter your rough costs and price to see how many copies you need to sell before your game starts making money.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-sm text-slate-300">
          <p className="font-semibold text-slate-200">Privacy note</p>
          <p className="mt-3 leading-6">
            This preview runs in your browser. Nothing is saved unless you create an account.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Development cost</span>
          <input
            type="number"
            min="0"
            step="1"
            value={developmentCost}
            onChange={(event) => setDevelopmentCost(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Marketing cost</span>
          <input
            type="number"
            min="0"
            step="1"
            value={marketingCost}
            onChange={(event) => setMarketingCost(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Other costs</span>
          <input
            type="number"
            min="0"
            step="1"
            value={otherCosts}
            onChange={(event) => setOtherCosts(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Game price</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </label>

        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">Steam platform fee</p>
          <p>30%</p>
        </div>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Withholding tax % after treaty (optional)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={withholdingTax}
            onChange={(event) => setWithholdingTax(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
          <p className="text-xs text-slate-500">
            Use 0% if no withholding applies. Steam may apply withholding depending on your country and tax treaty.
          </p>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Refund rate % (optional)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={refundRate}
            onChange={(event) => setRefundRate(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Publisher split % (optional)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={publisherSplitPercent}
            onChange={(event) => setPublisherSplitPercent(event.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </label>
      </div>

      {mode === "public" ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleShowResult}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-500"
          >
            Show my result
          </button>
        </div>
      ) : null}

      <div className="mt-8 rounded-[2rem] border border-slate-800 bg-slate-950/80 p-6">
        <div className={`grid gap-6 lg:grid-cols-3 ${shouldBlurResults ? "pointer-events-none select-none opacity-60 blur-sm" : ""}`}>
          <div className="rounded-3xl bg-slate-900/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Total cost</p>
            <p className="mt-4 text-3xl font-black text-white">{formatCurrency(totals.totalCost)}</p>
          </div>
          <div className="rounded-3xl bg-slate-900/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Net per copy</p>
            <p className="mt-4 text-3xl font-black text-white">
              {formatCurrencyWithDecimals(totals.revenueBreakdown.developerNetPerCopy)}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-900/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Break-even copies</p>
            <p className="mt-4 text-3xl font-black text-white">
              {totals.breakEvenCopies === null ? "—" : totals.breakEvenCopies.toLocaleString()}
            </p>
          </div>
        </div>

        {resultUnavailable ? (
          <p className="mt-6 rounded-2xl bg-slate-900/90 px-4 py-4 text-sm text-slate-300">
            Enter a price and keep net revenue above $0 so you can see a usable break-even target.
          </p>
        ) : null}
      </div>

      {mode === "public" ? (
        <div className="mt-6 rounded-[2rem] border border-blue-500/20 bg-blue-500/10 p-6 text-slate-200">
          <p className="text-lg font-bold text-white">Want to save this and keep planning?</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Create a free account to save your inputs and return to this model later.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleCreateAccount}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-500"
            >
              Create free account
            </button>
            <button
              type="button"
              onClick={handleContinueEditing}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 px-6 py-3 text-sm font-black text-slate-100 transition hover:border-blue-500/70"
            >
              Continue editing
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
