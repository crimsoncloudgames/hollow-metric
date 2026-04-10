import { CheckCircle2, Coins, Lightbulb, Sparkles, Store, Users } from "lucide-react";
import { CreditsBalanceLabel } from "@/components/credits-balance-label";
import { StarterCreditPackCheckoutButton } from "./starter-credit-pack-checkout-button";

const creditUsageItems = [
  {
    title: "Steam Tag Tool",
    description: "Spend credits on successful AI-powered tag generation.",
    icon: Sparkles,
    creditCostLabel: "Uses 1 credit per use",
  },
  {
    title: "Steam Store Page Analysis (coming later)",
    description: "Future credit usage for deeper Steam page recommendations.",
    icon: Store,
  },
  {
    title: "Creator Discovery (coming later)",
    description: "Future credit usage for creator and outreach tooling.",
    icon: Users,
  },
  {
    title: "Game Idea Generator (coming later)",
    description: "Future credit usage for generating and refining game concepts.",
    icon: Lightbulb,
  },
];

export default function BuyCreditsPage() {
  const starterPackPriceId = process.env.PADDLE_CREDITS_STARTER_3_PRICE_ID?.trim() ?? "";

  return (
    <section className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Current Balance</p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4">
            <Coins className="text-blue-400" size={22} />
            <CreditsBalanceLabel className="text-2xl font-black tracking-tight text-white" />
          </div>
          <p className="mt-4 max-w-xl text-sm text-slate-400">
            This balance is read from your current signed-in account and falls back to Credits: 0 when no credits row exists yet.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Trust</p>
          <p className="mt-4 text-lg font-bold text-white">If a generation fails, no credit should be deducted.</p>
          <p className="mt-3 text-sm text-slate-400">
            Credits are intended for successful AI actions only, so users can test tools without worrying about failed generations.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Credits Can Be Used For</p>
          <div className="mt-6 grid gap-4">
            {creditUsageItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="rounded-2xl bg-slate-900 p-3 text-blue-400">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <h2 className="text-base font-bold text-white">{item.title}</h2>
                      {item.creditCostLabel ? (
                        <span className="inline-flex w-fit items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                          {item.creditCostLabel}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-blue-500/25 bg-[linear-gradient(180deg,rgba(37,99,235,0.16),rgba(15,23,42,0.92)_35%,rgba(15,23,42,0.98)_100%)] p-6 shadow-[0_0_38px_rgba(37,99,235,0.15)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300/80">Launch Pack</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">Starter Credit Pack</h2>

          <div className="mt-6 flex items-end justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-400">Quantity</p>
              <p className="mt-1 text-2xl font-black text-white">3 Credits</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-400">Price</p>
              <p className="mt-1 text-3xl font-black text-blue-400">$5</p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-slate-300">
            A simple way to test the Steam Tag Tool without buying too much too early.
          </p>

          <StarterCreditPackCheckoutButton priceId={starterPackPriceId} />

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Secure checkout opens in Paddle.</p>

          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="mt-0.5 text-emerald-300" />
              <p className="text-sm text-emerald-100">If a generation fails, no credit should be deducted.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}