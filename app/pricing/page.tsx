import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "/month",
    description: "A limited preview for developers who want one useful signal before committing.",
    features: ["One preview result", "One actionable feedback note", "One suggested tag"],
  },
  {
    name: "Pro",
    price: "$29",
    cadence: "/month",
    description: "For developers who want full Steam page audits and saved reports.",
    features: ["Full audits", "Competitor discovery", "Saved reports"],
    featured: true,
  },
  {
    name: "Pay Per Audit",
    price: "$12",
    cadence: "/audit",
    description: "For milestone reviews when you need a deep audit without a subscription.",
    features: ["Single full audit", "One-time payment", "Actionable report output"],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-center justify-between">
          <Link href="/landing" className="text-2xl font-black italic text-blue-500">Hollow Metric</Link>
          <Link href="/signup?next=%2Fdashboard" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">Start Free</Link>
        </div>

        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Pricing</p>
          <h1 className="mb-4 text-4xl font-black text-white">Choose the level of Steam-page feedback you need.</h1>
          <p className="text-lg leading-8 text-slate-400">Prices are placeholders for now, but the page gives you a realistic structure for how Hollow Metric can be sold.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={[
                "rounded-[2rem] border p-8",
                plan.featured ? "border-blue-500/50 bg-blue-600/10" : "border-slate-800 bg-slate-900/60",
              ].join(" ")}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{plan.name}</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-black text-white">{plan.price}</span>
                <span className="pb-2 text-slate-400">{plan.cadence}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{plan.description}</p>
              <div className="mt-6 space-y-3 text-sm text-slate-400">
                {plan.features.map((feature) => (
                  <p key={feature}>{feature}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
