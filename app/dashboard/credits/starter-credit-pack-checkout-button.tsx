"use client";

import { useEffect, useState } from "react";
import { dispatchCreditsBalanceUpdated, normalizeCreditsBalance } from "@/lib/credits-ui";
import { openPaddleCheckout } from "@/lib/paddle";
import { createClient } from "@/utils/supabase/client";

type StarterCreditPackCheckoutButtonProps = {
  priceId: string;
  packLabel?: string;
  buttonLabel?: string;
  disabled?: boolean;
};

const CHECKOUT_FAILED_MESSAGE = "We couldn't open Paddle checkout right now. Please try again.";
const CHECKOUT_SUCCESS_QUERY_KEY = "checkout";
const CHECKOUT_SUCCESS_QUERY_VALUE = "success";
const CREDITS_BALANCE_BEFORE_QUERY_KEY = "creditsBalanceBefore";
const CREDITS_SYNC_INTERVAL_MS = 3000;
const CREDITS_SYNC_MAX_ATTEMPTS = 10;

function getMissingPriceIdMessage(packLabel: string) {
  return `${packLabel} checkout is not configured right now. Please choose another pack or try again later.`;
}

function getCreditsCheckoutSuccessUrl(balanceBefore?: number) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const checkoutReturnUrl = new URL(window.location.href);
  checkoutReturnUrl.searchParams.set(CHECKOUT_SUCCESS_QUERY_KEY, CHECKOUT_SUCCESS_QUERY_VALUE);

  if (typeof balanceBefore === "number") {
    checkoutReturnUrl.searchParams.set(
      CREDITS_BALANCE_BEFORE_QUERY_KEY,
      String(normalizeCreditsBalance(balanceBefore)),
    );
  } else {
    checkoutReturnUrl.searchParams.delete(CREDITS_BALANCE_BEFORE_QUERY_KEY);
  }

  return checkoutReturnUrl.toString();
}

function clearCreditsCheckoutReturnState() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(CHECKOUT_SUCCESS_QUERY_KEY);
  url.searchParams.delete(CREDITS_BALANCE_BEFORE_QUERY_KEY);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

async function loadCurrentCreditsBalance() {
  const supabase = createClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeCreditsBalance(data?.balance);
}

export function StarterCreditPackCheckoutButton({
  priceId,
  packLabel = "This credit pack",
  buttonLabel = "Buy 3 Credits",
  disabled = false,
}: StarterCreditPackCheckoutButtonProps) {
  const [isLaunchingCheckout, setIsLaunchingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutStatusMessage, setCheckoutStatusMessage] = useState<string | null>(null);
  const [isSyncingCheckoutResult, setIsSyncingCheckoutResult] = useState(false);
  const isButtonDisabled = disabled || isLaunchingCheckout || isSyncingCheckoutResult;

  useEffect(() => {
    setCheckoutError(null);
  }, [packLabel, priceId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const isSuccessfulCheckoutReturn =
      url.searchParams.get(CHECKOUT_SUCCESS_QUERY_KEY) === CHECKOUT_SUCCESS_QUERY_VALUE;

    if (!isSuccessfulCheckoutReturn) {
      return;
    }

    let mounted = true;
    let timeoutId: number | null = null;
    let attempts = 0;
    let observedStartingBalance: number | null = null;

    const baselineFromQuery = (() => {
      const rawBalance = url.searchParams.get(CREDITS_BALANCE_BEFORE_QUERY_KEY);
      if (rawBalance === null) {
        return null;
      }

      const parsedBalance = Number(rawBalance);
      return Number.isFinite(parsedBalance) ? normalizeCreditsBalance(parsedBalance) : null;
    })();

    const stopSync = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const finishSync = ({
      balance,
      message,
      clearReturnState = true,
    }: {
      balance?: number;
      message?: string | null;
      clearReturnState?: boolean;
    } = {}) => {
      stopSync();

      if (!mounted) {
        return;
      }

      if (typeof balance === "number") {
        dispatchCreditsBalanceUpdated({ balance });
      }

      setIsSyncingCheckoutResult(false);
      setCheckoutStatusMessage(message ?? null);

      if (clearReturnState) {
        clearCreditsCheckoutReturnState();
      }
    };

    const pollForUpdatedBalance = async () => {
      try {
        const currentBalance = await loadCurrentCreditsBalance();

        if (!mounted) {
          return;
        }

        if (typeof currentBalance === "number") {
          const comparisonBalance =
            baselineFromQuery ?? observedStartingBalance;

          if (comparisonBalance === null) {
            observedStartingBalance = currentBalance;
          } else if (currentBalance !== comparisonBalance) {
            finishSync({ balance: currentBalance });
            return;
          }
        }
      } catch (error) {
        console.error("Failed to refresh credits balance after checkout", error);
      }

      attempts += 1;

      if (attempts >= CREDITS_SYNC_MAX_ATTEMPTS) {
        finishSync({
          message: "Still processing your purchase. Your credit balance should update shortly.",
        });
        return;
      }

      timeoutId = window.setTimeout(() => {
        void pollForUpdatedBalance();
      }, CREDITS_SYNC_INTERVAL_MS);
    };

    setCheckoutError(null);
    setIsSyncingCheckoutResult(true);
    setCheckoutStatusMessage("Processing purchase...");
    void pollForUpdatedBalance();

    return () => {
      mounted = false;
      stopSync();
    };
  }, []);

  const handleCheckout = async () => {
    const normalizedPriceId = priceId.trim();

    if (isButtonDisabled) {
      return;
    }

    if (!normalizedPriceId) {
      setCheckoutError(getMissingPriceIdMessage(packLabel));
      return;
    }

    setIsLaunchingCheckout(true);
    setCheckoutError(null);

    try {
      const supabase = createClient();
      let userId: string | undefined;
      let email: string | undefined;
      let currentBalance: number | undefined;

      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        userId = user?.id;
        email = user?.email ?? undefined;

        if (user?.id) {
          const { data, error } = await supabase
            .from("user_credits")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) {
            console.error("Failed to read credits balance before checkout", error);
          } else {
            currentBalance = normalizeCreditsBalance(data?.balance);
          }
        }
      }

      await openPaddleCheckout(normalizedPriceId, {
        userId,
        email,
        successUrl: getCreditsCheckoutSuccessUrl(currentBalance),
      });
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : CHECKOUT_FAILED_MESSAGE;
      setCheckoutError(message);
    } finally {
      setIsLaunchingCheckout(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          void handleCheckout();
        }}
        disabled={isButtonDisabled}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
      >
        {isLaunchingCheckout ? "Opening Checkout..." : buttonLabel}
      </button>

      {checkoutError ? (
        <p className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
          {checkoutError}
        </p>
      ) : null}

      {checkoutStatusMessage && !checkoutError ? (
        <p className="mt-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100" role="status">
          {checkoutStatusMessage}
        </p>
      ) : null}
    </div>
  );
}