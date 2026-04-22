"use client";

import { useEffect, useState } from "react";

import { CreditsBalanceLabel } from "@/components/credits-balance-label";
import {
  CREDITS_BALANCE_UPDATED_EVENT,
  type CreditsBalanceUpdatedDetail,
  dispatchCreditsBalanceUpdated,
  normalizeCreditsBalance,
} from "@/lib/credits-ui";
import { createClient } from "@/utils/supabase/client";

type ComparableGameResult = {
  appId?: string;
  title: string;
  currentPrice: string;
  originalListPrice?: string;
  reason: string;
};

type CompetitorPriceComparisonResponse = {
  sourceGameTitle: string;
  comparables: ComparableGameResult[];
  remainingCredits?: number;
  disclaimer: string;
  suggested_price_range_min: string;
  suggested_price_range_max: string;
  recommended_price: string;
  pricing_rationale: string;
};

type CompetitorFindResponse = {
  sourceGameTitle: string;
  sourceAppId: string;
  competitors: Array<{
    appId: string;
    title: string;
    currentPrice: string;
    originalListPrice: string;
    shortDescription: string;
    genres: string[];
    categories: string[];
    fitLabel: "Strong" | "Medium" | "Weak";
    fitScore: number;
    reason: string;
    selected: boolean;
  }>;
  selectedCompetitorAppIds: string[];
  selectedComparables?: unknown[];
  enoughComparables: boolean;
  insufficientDataReason: string | null;
  disclaimer: string;
};

const REQUIRED_CREDIT_MESSAGE = "You need at least 1 credit to use this feature.";

function isCompetitorPriceComparisonResponse(
  value: unknown
): value is CompetitorPriceComparisonResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.sourceGameTitle === "string" &&
    typeof record.disclaimer === "string" &&
    typeof record.suggested_price_range_min === "string" &&
    typeof record.suggested_price_range_max === "string" &&
    typeof record.recommended_price === "string" &&
    typeof record.pricing_rationale === "string" &&
    Array.isArray(record.comparables) &&
    record.comparables.every((comparable) => {
      if (!comparable || typeof comparable !== "object") {
        return false;
      }

      const entry = comparable as Record<string, unknown>;

      return (
        (entry.appId === undefined || typeof entry.appId === "string") &&
        typeof entry.title === "string" &&
        typeof entry.currentPrice === "string" &&
        (entry.originalListPrice === undefined || typeof entry.originalListPrice === "string") &&
        typeof entry.reason === "string"
      );
    }) &&
    (record.remainingCredits === undefined || typeof record.remainingCredits === "number")
  );
}

function isCompetitorFindResponse(value: unknown): value is CompetitorFindResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.sourceGameTitle === "string" &&
    typeof record.sourceAppId === "string" &&
    typeof record.enoughComparables === "boolean" &&
    (record.insufficientDataReason === null || typeof record.insufficientDataReason === "string") &&
    typeof record.disclaimer === "string" &&
    Array.isArray(record.selectedCompetitorAppIds) &&
    (record.selectedCompetitorAppIds as unknown[]).every((s) => typeof s === "string") &&
    Array.isArray(record.competitors) &&
    record.competitors.every((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const competitor = entry as Record<string, unknown>;
      return (
        typeof competitor.appId === "string" &&
        typeof competitor.title === "string" &&
        typeof competitor.currentPrice === "string" &&
        typeof competitor.originalListPrice === "string" &&
        typeof competitor.shortDescription === "string" &&
        Array.isArray(competitor.genres) &&
        Array.isArray(competitor.categories) &&
        (competitor.fitLabel === "Strong" ||
          competitor.fitLabel === "Medium" ||
          competitor.fitLabel === "Weak") &&
        typeof competitor.fitScore === "number" &&
        typeof competitor.reason === "string" &&
        typeof competitor.selected === "boolean"
      );
    })
  );
}

async function getCompetitorPriceComparisonAuthState() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const supabase = createClient();

  if (!supabase) {
    return {
      headers,
      balance: 0,
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = session?.access_token?.trim();

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (!session?.user) {
    return {
        </div>
      ))}      {Array.isArray(dbg._debugRejectedCandidates) &&
      (dbg._debugRejectedCandidates as Array<unknown>).length > 0 ? (
        <>
          <p style={{ marginTop: 8, fontWeight: "bold", color: "#ff8844" }}>
            Rejected by acceptance gate ({(dbg._debugRejectedCandidates as Array<unknown>).length}):
          </p>
          {(dbg._debugRejectedCandidates as Array<Record<string, unknown>>).map((r, i) => (
            <div
              key={i}
              style={{ marginTop: 4, paddingLeft: 8, borderLeft: "2px solid #884422", color: "#cc6633" }}
            >
              ✗ [{r.rejectionReason as string}] {r.resolvedTitle as string} (searched:{" "}
              {r.candidateTitle as string})
            </div>
          ))}
        </>
      ) : null}    </div>
  );
}

export function CompetitorPriceComparisonSection() {
  const [steamUrl, setSteamUrl] = useState("");
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const [isCheckingCredits, setIsCheckingCredits] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] =
    useState<CompetitorPriceComparisonResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    const refreshCreditsBalance = async () => {
      setIsCheckingCredits(true);

      try {
        const { balance } = await getCompetitorPriceComparisonAuthState();

        if (!mounted) {
          return;
        }

        setAvailableCredits(balance);
      } catch (error) {
        console.error("Failed to load competitor price comparison credits balance", error);

        if (!mounted) {
          return;
        }

        setAvailableCredits(0);
      } finally {
        if (mounted) {
          setIsCheckingCredits(false);
        }
      }
    };

    const handleCreditsBalanceUpdated = (event: Event) => {
      const nextBalance = (event as CustomEvent<CreditsBalanceUpdatedDetail>).detail?.balance;

      if (typeof nextBalance === "number") {
        setAvailableCredits(normalizeCreditsBalance(nextBalance));
        setIsCheckingCredits(false);
        return;
      }

      void refreshCreditsBalance();
    };

    const supabase = createClient();
    const authSubscription = supabase?.auth.onAuthStateChange(() => {
      void refreshCreditsBalance();
    });

    void refreshCreditsBalance();
    window.addEventListener(CREDITS_BALANCE_UPDATED_EVENT, handleCreditsBalanceUpdated);
    window.addEventListener("focus", refreshCreditsBalance);
    window.addEventListener("pageshow", refreshCreditsBalance);

    return () => {
      mounted = false;
      authSubscription?.data.subscription.unsubscribe();
      window.removeEventListener(
        CREDITS_BALANCE_UPDATED_EVENT,
        handleCreditsBalanceUpdated
      );
      window.removeEventListener("focus", refreshCreditsBalance);
      window.removeEventListener("pageshow", refreshCreditsBalance);
    };
  }, []);

  const buttonDisabled =
    isLoading || isCheckingCredits || steamUrl.trim().length === 0 || availableCredits === 0;

  const handleSubmit = async () => {
    const trimmedUrl = steamUrl.trim();

    if (!trimmedUrl) {
      setComparisonError("Paste a valid Steam page URL before comparing prices.");
      setComparisonResult(null);
      return;
    }

    setIsLoading(true);
    setComparisonError(null);
    setComparisonResult(null);

    try {
      const authState = await getCompetitorPriceComparisonAuthState();

      setAvailableCredits(authState.balance);

      if (authState.balance < 1) {
        setComparisonError(REQUIRED_CREDIT_MESSAGE);
        return;
      }

      const findResponse = await fetch("/api/competitor-price-comparison/find", {
        method: "POST",
        credentials: "include",
        headers: authState.headers,
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const findPayload = (await findResponse.json()) as unknown;

      if (!findResponse.ok) {
        const message =
          findPayload &&
          typeof findPayload === "object" &&
          typeof (findPayload as { error?: unknown }).error === "string"
            ? (findPayload as { error: string }).error
            : "We couldn't compare competitor prices right now. Please try again.";

        throw new Error(message);
      }

      if (!isCompetitorFindResponse(findPayload)) {
        throw new Error("We couldn't validate enough competitors from this Steam page.");
      }

      if (!findPayload.enoughComparables) {
        throw new Error(
          typeof findPayload.insufficientDataReason === "string"
            ? findPayload.insufficientDataReason
            : "We couldn't validate enough competitors from this Steam page."
        );
      }

      if (findPayload.selectedCompetitorAppIds.length !== 3) {
        throw new Error(
          "We couldn't validate enough competitors from this Steam page."
        );
      }

      const priceRequestBody = {
        sourceGameTitle: findPayload.sourceGameTitle,
        sourceAppId: findPayload.sourceAppId,
        competitors: findPayload.competitors,
        selectedCompetitorAppIds: findPayload.selectedCompetitorAppIds,
      };

      const priceResponse = await fetch("/api/competitor-price-comparison/price", {
        method: "POST",
        credentials: "include",
        headers: authState.headers,
        body: JSON.stringify(priceRequestBody),
      });

      const responseBody = (await priceResponse.json()) as unknown;

      if (!priceResponse.ok) {
        const message =
          responseBody &&
          typeof responseBody === "object" &&
          typeof (responseBody as { error?: unknown }).error === "string"
            ? (responseBody as { error: string }).error
            : "We couldn't compare competitor prices right now. Please try again.";

        throw new Error(message);
      }

      if (!isCompetitorPriceComparisonResponse(responseBody)) {
        throw new Error("The competitor comparison returned an unexpected response.");
      }

      const normalizedResult: CompetitorPriceComparisonResponse = {
        sourceGameTitle: responseBody.sourceGameTitle.trim(),
        comparables: responseBody.comparables.slice(0, 3).map((comparable) => ({
          appId: comparable.appId?.trim(),
          title: comparable.title.trim(),
          currentPrice: comparable.currentPrice.trim(),
          originalListPrice: comparable.originalListPrice?.trim(),
          reason: comparable.reason.trim(),
        })),
        disclaimer: responseBody.disclaimer.trim(),
        suggested_price_range_min: responseBody.suggested_price_range_min.trim(),
        suggested_price_range_max: responseBody.suggested_price_range_max.trim(),
        recommended_price: responseBody.recommended_price.trim(),
        pricing_rationale: responseBody.pricing_rationale.trim(),
        remainingCredits:
          typeof responseBody.remainingCredits === "number"
            ? normalizeCreditsBalance(responseBody.remainingCredits)
            : undefined,
      };

      setComparisonResult(normalizedResult);

      if (typeof normalizedResult.remainingCredits === "number") {
        setAvailableCredits(normalizedResult.remainingCredits);
        dispatchCreditsBalanceUpdated({ balance: normalizedResult.remainingCredits });
      }
    } catch (error) {
      setComparisonError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "We couldn't compare competitor prices right now. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
      <h2 className="text-2xl font-black text-white">Competitor Price Comparison</h2>
      <p className="mt-2 text-sm text-slate-400">
        Paste your Steam page URL to get suggested comparable games and pricing context.
      </p>

      <form
        className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="space-y-2">
          <label
            htmlFor="competitor-price-comparison-steam-url"
            className="block text-sm font-semibold text-slate-300"
          >
            Steam page URL
          </label>
          <input
            id="competitor-price-comparison-steam-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://store.steampowered.com/app/620/Portal_2/"
            value={steamUrl}
            onChange={(event) => {
              setSteamUrl(event.target.value);
              if (comparisonError) {
                setComparisonError(null);
              }
            }}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={buttonDisabled}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
            >
              {isLoading ? "Comparing..." : "Compare Competitor Prices"}
            </button>

            <div className="inline-flex items-center rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
              <CreditsBalanceLabel className="text-sm font-black tracking-[0.02em] text-white" />
            </div>
          </div>

          <p className="text-xs text-slate-500">Costs 1 credit per successful result.</p>
        </div>

        {!isCheckingCredits && availableCredits === 0 ? (
          <p className="mt-4 text-sm font-semibold text-rose-300" role="alert">
            {REQUIRED_CREDIT_MESSAGE}
          </p>
        ) : null}

        {comparisonError ? (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {comparisonError}
          </div>
        ) : null}
      </form>

      {comparisonResult ? (
        <div className="mt-6 space-y-4">
          {comparisonResult.sourceGameTitle ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Input Game
              </p>
              <p className="mt-2 text-lg font-black text-white">
                {comparisonResult.sourceGameTitle}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            {comparisonResult.comparables.map((comparable) => (
              <article
                key={`${comparable.title}:${comparable.currentPrice}`}
                className="rounded-2xl border border-blue-600/25 bg-blue-600/10 p-5"
              >
                <p className="text-sm font-black text-white">{comparable.title}</p>
                <p className="mt-2 text-xl font-black text-blue-300">
                  {comparable.currentPrice}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {comparable.reason}
                </p>
              </article>
            ))}
          </div>

          <p className="text-xs leading-6 text-slate-500">
            Suggested comparable games are provided as pricing context only and may not be perfect matches.
          </p>
        </div>
      ) : null}
    </div>
  );
}