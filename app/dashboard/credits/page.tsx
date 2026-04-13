import { Coins, Lightbulb, Sparkles, Store, Users } from "lucide-react";
import { CreditsBalanceLabel } from "@/components/credits-balance-label";
import { CreditPackSelector, type CreditPackOption } from "./credit-pack-selector";

const creditUsageItems = [
  {
    title: "Game Idea Generator",
    description: "Spend credits on generating and refining game concepts.",
    icon: Lightbulb,
    creditCostLabel: "Uses 1 credit per use",
  },
  {
    title: "Steam Tag Tool (coming later)",
    description: "Future credit usage for AI-powered tag generation.",
    icon: Sparkles,
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
];

const creditPackOptions: CreditPackOption[] = [
  {
    id: "starter-1",
    credits: 1,
    priceLabel: "$3",
    priceId: process.env.PADDLE_CREDITS_1_PRICE_ID?.trim() ?? "",
  },
  {
    id: "starter-3",
    credits: 3,
    priceLabel: "$5",
    priceId: process.env.PADDLE_CREDITS_3_PRICE_ID?.trim() ?? "",
    isDefault: true,
  },
  {
    id: "starter-6",
    credits: 6,
    priceLabel: "$9",
    priceId: process.env.PADDLE_CREDITS_6_PRICE_ID?.trim() ?? "",
  },
  {
    id: "starter-10",
    credits: 10,
    priceLabel: "$13",
    priceId: process.env.PADDLE_CREDITS_10_PRICE_ID?.trim() ?? "",
  },
];

export default function BuyCreditsPage() {
  return (
    <section className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] xl:items-stretch">
        <div className="space-y-6">
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
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Credits Can Be Used For</p>
            <div className="mt-6 grid gap-4 xl:gap-5">
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
        </div>

        <CreditPackSelector packOptions={creditPackOptions} />
      </div>

      <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Trust</p>
        <p className="mt-4 max-w-3xl text-2xl font-black leading-tight text-white sm:text-3xl">
          If a generation fails, no credit will be deducted.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
          Credits are intended for successful AI actions only, so users can test tools without worrying about failed generations.
        </p>
      </div>
    </section>
  );
}