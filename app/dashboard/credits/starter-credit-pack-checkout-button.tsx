"use client";

import { useEffect, useState } from "react";
import { openPaddleCheckout } from "@/lib/paddle";
import { createClient } from "@/utils/supabase/client";

type StarterCreditPackCheckoutButtonProps = {
  priceId: string;
  packLabel?: string;
  buttonLabel?: string;
  disabled?: boolean;
};

const CHECKOUT_FAILED_MESSAGE = "We couldn't open Paddle checkout right now. Please try again.";

function getMissingPriceIdMessage(packLabel: string) {
  return `${packLabel} checkout is not configured right now. Please choose another pack or try again later.`;
}

export function StarterCreditPackCheckoutButton({
  priceId,
  packLabel = "This credit pack",
  buttonLabel = "Buy 3 Credits",
  disabled = false,
}: StarterCreditPackCheckoutButtonProps) {
  const [isLaunchingCheckout, setIsLaunchingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const isButtonDisabled = disabled || isLaunchingCheckout;

  useEffect(() => {
    setCheckoutError(null);
  }, [packLabel, priceId]);

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

      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        userId = user?.id;
        email = user?.email ?? undefined;
      }

      await openPaddleCheckout(normalizedPriceId, { userId, email });
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
    </div>
  );
}