"use client";

import { useState } from "react";

import { StarterCreditPackCheckoutButton } from "./starter-credit-pack-checkout-button";

export type CreditPackOption = {
  id: string;
  credits: number;
  priceLabel: string;
  priceId: string;
  helperText?: string;
  isDefault?: boolean;
};

type CreditPackSelectorProps = {
  packOptions: CreditPackOption[];
};

function formatCreditsLabel(credits: number) {
  return `${credits} ${credits === 1 ? "Credit" : "Credits"}`;
}

function getDefaultSelectedPackId(packOptions: CreditPackOption[]) {
  return (
    packOptions.find((packOption) => packOption.isDefault)?.id ??
    packOptions.find((packOption) => packOption.credits === 3)?.id ??
    packOptions[0]?.id ??
    ""
  );
}

export function CreditPackSelector({ packOptions }: CreditPackSelectorProps) {
  const [selectedPackId, setSelectedPackId] = useState(() => getDefaultSelectedPackId(packOptions));

  const selectedPack =
    packOptions.find((packOption) => packOption.id === selectedPackId) ??
    packOptions.find((packOption) => packOption.isDefault) ??
    packOptions.find((packOption) => packOption.credits === 3) ??
    packOptions[0] ??
    null;

  if (!selectedPack) {
    return null;
  }

  return (
    <div className="flex flex-col rounded-3xl border border-blue-500/25 bg-[linear-gradient(180deg,rgba(37,99,235,0.16),rgba(15,23,42,0.92)_35%,rgba(15,23,42,0.98)_100%)] p-5 shadow-[0_0_38px_rgba(37,99,235,0.15)] sm:p-8 xl:h-full">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300/80">Credit Pack</p>

        <div className="mt-6 grid gap-4">
          {packOptions.map((packOption) => {
            const isSelected = packOption.id === selectedPack.id;

            return (
              <button
                key={packOption.id}
                type="button"
                onClick={() => setSelectedPackId(packOption.id)}
                aria-pressed={isSelected}
                className={[
                  "min-h-[116px] rounded-2xl border px-5 py-5 text-left transition",
                  isSelected
                    ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_24px_rgba(59,130,246,0.18)]"
                    : "border-slate-800 bg-slate-950/70 hover:border-blue-500/30 hover:bg-slate-950",
                ].join(" ")}
              >
                <div className="flex h-full flex-col justify-between gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-400">Quantity</p>
                      <p className="mt-1 text-2xl font-black text-white">{formatCreditsLabel(packOption.credits)}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm font-semibold text-slate-400">Price</p>
                      <p className="mt-1 text-3xl font-black text-blue-400">{packOption.priceLabel}</p>
                    </div>
                  </div>
                  {packOption.helperText ? (
                    <p className="text-sm text-slate-400">{packOption.helperText}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-2">
        <p className="text-sm leading-7 text-slate-300">
          A simple way to test extra features without buying too much too early.
        </p>

        <StarterCreditPackCheckoutButton
          priceId={selectedPack.priceId}
          packLabel={formatCreditsLabel(selectedPack.credits)}
          buttonLabel="Buy Credits"
        />

        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Secure checkout opens in Paddle.
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          If you encounter any problem, contact support at support@hollowmetric.com.
        </p>
      </div>
    </div>
  );
}