import Link from "next/link";
import { PAID_SUBSCRIPTIONS_UNAVAILABLE_MESSAGE } from "@/lib/billing";

type PricingPlanBase = {
  name: string;
  price: string;
  featured: boolean;
  comingSoon: boolean;
  description?: string;
  features: string[];
};

type PricingPlanWithLink = PricingPlanBase & {
  ctaState: "link";
  ctaHref: string;
};

type PricingPlanDisabled = PricingPlanBase & {
  ctaState: "disabled";
};

type PricingPlanComingSoon = PricingPlanBase & {
  ctaState: "coming-soon";
  comingSoon: true;
};

type PricingPlan = PricingPlanWithLink | PricingPlanDisabled | PricingPlanComingSoon;

const plans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$0",
    featured: false,
    comingSoon: false,
    ctaState: "link",
    ctaHref: "/signup",
    features: [
      "Calculator access only",
      "Basic financial inputs",
      "Basic break-even calculation",
      "No saved projects",
      "No premium dashboard features",
    ],
  },
  {
    name: "Launch Planner",
    price: "$12/mo",
    description: "Save, track, and organize launch financial plans.",
    featured: true,
    comingSoon: false,
    ctaState: "disabled",
    features: [
      "Save financial projects",
      "Financial library",
      "Dashboard tracking",
      "Deeper financial analysis",
      "Better history and organization features",
    ],
  },
  {
    name: "MORE PLANS",
    price: "Coming Soon",
    description: "Additional tiers are in development.",
    featured: false,
    comingSoon: true,
    ctaState: "coming-soon",
    features: [
      "Additional options for studios and teams",
      "Expanded project capacity",
      "More advanced planning workflows",
      "Future premium features",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-center justify-between">
          <Link href="/landing" className="text-2xl font-black italic text-blue-500">Hollow Metric</Link>
          <Link href="/signup" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">Start Free</Link>
        </div>

        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Pricing</p>
          <h1 className="mb-4 text-4xl font-black text-white">Choose the level of launch planning you need.</h1>
          <p className="text-lg leading-8 text-slate-400">Estimate your launch budget and stress-test price points before bad assumptions turn into real losses.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={[
                "rounded-[2rem] border p-8 flex flex-col",
                plan.featured ? "border-blue-500/50 bg-blue-600/10 ring-2 ring-blue-500/30" : "border-slate-800 bg-slate-900/60",
              ].join(" ")}
            >
              <div>
                {plan.featured && (
                  <div className="mb-3 inline-flex rounded-full border border-blue-500/50 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-blue-300">
                    Recommended
                  </div>
                )}
                <p className={["text-[10px] font-black uppercase tracking-[0.3em]", plan.featured ? "text-blue-400" : "text-slate-500"].join(" ")}>{plan.name}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className={plan.comingSoon ? "text-4xl font-black uppercase tracking-[0.08em] text-slate-200" : "text-5xl font-black text-white"}>
                    {plan.price}
                  </span>
                </div>
                {plan.description && <p className="mt-4 text-sm leading-7 text-slate-300">{plan.description}</p>}
              </div>
              <div className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              {plan.comingSoon ? (
                <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/50 px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
                  Not available yet
                </div>
              ) : plan.ctaState === "disabled" ? (
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className={[
                      "w-full cursor-not-allowed rounded-2xl px-5 py-3 text-center text-sm font-semibold opacity-80",
                      plan.featured
                        ? "border border-blue-900/30 bg-blue-950/20 text-blue-300/70"
                        : "border border-slate-700 bg-slate-800/50 text-slate-400",
                    ].join(" ")}
                  >
                    Get Started
                  </button>
                  <p className="text-xs leading-6 text-slate-400">{PAID_SUBSCRIPTIONS_UNAVAILABLE_MESSAGE}</p>
                </div>
              ) : (
                <Link
                  href={plan.ctaHref}
                  className={[
                    "mt-6 rounded-2xl px-5 py-3 text-center text-sm font-semibold transition",
                    plan.featured
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-blue-300",
                  ].join(" ")}
                >
                  Get Started
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

