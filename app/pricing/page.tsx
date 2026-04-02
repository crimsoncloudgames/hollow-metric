import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/month",
    description: "Check whether your current launch math holds up.",
    features: [
      "Check whether your current launch math holds up",
      "Estimate major service costs before approving quotes",
      "Get a first real break-even target instead of a guess",
      "See the financial blind spots before you spend more",
    ],
  },
  {
    name: "Launch Planner",
    price: "$19",
    cadence: "/month",
    description: "Keep launch math real as quotes and scope change.",
    features: [
      "Keep launch math real as quotes and scope change",
      "Stress-test multiple price points before you commit",
      "Track new costs before they quietly wreck margin",
      "AI flags expensive quotes, weak spend, and budget waste",
      "Re-check break-even every time the plan moves",
    ],
    featured: true,
  },
  {
    name: "Studio",
    price: "$49",
    cadence: "/month",
    description: "Everything in Launch Planner plus multiple saved projects.",
    features: [
      "Everything in Launch Planner",
      "Multiple launch plans for small teams with real spend",
      "Scenario comparisons across projects or release windows",
      "More room to pressure test risky decisions",
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
                    Best Protection
                  </div>
                )}
                <p className={["text-[10px] font-black uppercase tracking-[0.3em]", plan.featured ? "text-blue-400" : "text-slate-500"].join(" ")}>{plan.name}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  <span className="pb-2 text-slate-400">{plan.cadence}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{plan.description}</p>
              </div>
              <div className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                className={[
                  "mt-6 rounded-2xl px-5 py-3 text-center text-sm font-semibold transition",
                  plan.featured
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-blue-300",
                ].join(" ")}
              >
                Get Started
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

