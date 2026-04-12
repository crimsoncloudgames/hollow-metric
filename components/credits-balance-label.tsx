"use client";

import { useEffect, useState } from "react";
import {
  CREDITS_BALANCE_UPDATED_EVENT,
  type CreditsBalanceUpdatedDetail,
  formatCreditsBalanceLabel,
  normalizeCreditsBalance,
  UI_CREDITS_PLACEHOLDER_BALANCE,
} from "@/lib/credits-ui";
import { createClient } from "@/utils/supabase/client";

type CreditsBalanceLabelProps = {
  className?: string;
};

export function CreditsBalanceLabel({ className }: CreditsBalanceLabelProps) {
  const [balance, setBalance] = useState(UI_CREDITS_PLACEHOLDER_BALANCE);

  useEffect(() => {
    let mounted = true;

    const loadBalance = async () => {
      try {
        const supabase = createClient();

        if (!supabase) {
          if (mounted) {
            setBalance(UI_CREDITS_PLACEHOLDER_BALANCE);
          }
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (!user) {
          if (process.env.NODE_ENV !== "production") {
            console.info("Credits UI balance auth", {
              source: "credits-balance-label",
              userId: null,
              hasCreditRow: false,
              balance: UI_CREDITS_PLACEHOLDER_BALANCE,
            });
          }

          setBalance(UI_CREDITS_PLACEHOLDER_BALANCE);
          return;
        }

        const { data, error } = await supabase
          .from("user_credits")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error("Failed to load user credits balance", error);
          setBalance(UI_CREDITS_PLACEHOLDER_BALANCE);
          return;
        }

        const normalizedBalance = normalizeCreditsBalance(data?.balance);

        if (process.env.NODE_ENV !== "production") {
          console.info("Credits UI balance auth", {
            source: "credits-balance-label",
            userId: user.id,
            hasCreditRow: Boolean(data),
            balance: normalizedBalance,
          });
        }

        setBalance(normalizedBalance);
      } catch (error) {
        console.error("Failed to resolve credits balance auth state", error);

        if (mounted) {
          setBalance(UI_CREDITS_PLACEHOLDER_BALANCE);
        }
      }
    };

    const refresh = () => {
      void loadBalance();
    };

    const handleCreditsBalanceUpdated = (event: Event) => {
      const nextBalance = (event as CustomEvent<CreditsBalanceUpdatedDetail>).detail?.balance;

      if (typeof nextBalance === "number") {
        setBalance(normalizeCreditsBalance(nextBalance));
        return;
      }

      refresh();
    };

    const supabase = createClient();
    const authSubscription = supabase?.auth.onAuthStateChange(() => {
      refresh();
    });

    refresh();
    window.addEventListener(CREDITS_BALANCE_UPDATED_EVENT, handleCreditsBalanceUpdated);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);

    return () => {
      mounted = false;
      authSubscription?.data.subscription.unsubscribe();
      window.removeEventListener(CREDITS_BALANCE_UPDATED_EVENT, handleCreditsBalanceUpdated);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  return <span className={className}>{formatCreditsBalanceLabel(balance)}</span>;
}