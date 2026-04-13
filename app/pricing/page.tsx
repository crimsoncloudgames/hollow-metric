import Link from "next/link";

type PricingPlan = {
  name: string;
  price: string;
  featured: boolean;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  ctaSupportingText?: string;
  features: string[];
};

const plans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$0",
    featured: false,
    description: "Start planning your launch and pressure-test the basics before you commit more money.",
    ctaHref: "/signup",
    ctaLabel: "Start Free",
    features: [
      "Core budget and break-even tools",
      "Quick way to test a price point",
      "A simple starting point for first-pass planning",
      "No saved projects or dashboard history yet",
    ],
  },
  {
    name: "Launch Planner",
    price: "$12/mo",
    description: "Save work, track assumptions, and make clearer launch decisions in one place.",
    featured: true,
    ctaHref: "/signup",
    ctaLabel: "Choose Launch Planner",
    ctaSupportingText:
      "Extra AI-powered usage uses credits only when you choose to use it.",
    features: [
      "Save and revisit launch plans",
      "Keep budget, pricing, and project assumptions organized",
      "Use dashboard tools for a more serious planning workflow",
      "1 included credit to test the AI Game Idea Generator",
    ],
  },
];

const upgradeReasons = [
  {
    title: "Save the work worth revisiting",
    body: "Keep launch assumptions, pricing ideas, and project planning in one place instead of rebuilding them every time.",
  },
  {
    title: "Compare decisions more seriously",
    body: "Use Hollow Metric when you are moving past rough estimates and need clearer tradeoffs around budget, pricing, and launch risk.",
  },
  {
    title: "Keep planning and idea work connected",
    body: "Launch planning and the Game Idea Generator live inside the same product, so your concept direction does not drift away from your launch reality.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-center justify-between">
          <Link href="/landing" className="text-2xl font-black italic text-blue-500">Hollow Metric</Link>
          <div className="flex items-center gap-3">
            <Link href="/landing" className="rounded-full border border-slate-700 px-5 py-2 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">Home</Link>
            <Link href="/signup" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">Start Free</Link>
          </div>
        </div>

        <div className="mb-12 max-w-4xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Pricing</p>
          <h1 className="mb-4 text-4xl font-black text-white">Start free, then upgrade when you want clearer launch and concept decisions.</h1>
          <p className="text-lg leading-8 text-slate-400">Hollow Metric helps indie developers model launch budget, pressure-test break-even numbers, and shape rough ideas into clearer directions. Start with Starter, then move to Launch Planner when you want saved work, better tracking, and a more serious workflow.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
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
                    Best for active planning
                  </div>
                )}
                <p className={["text-[10px] font-black uppercase tracking-[0.3em]", plan.featured ? "text-blue-400" : "text-slate-500"].join(" ")}>{plan.name}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
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
              <div className="mt-6 space-y-3">
                <Link
                  href={plan.ctaHref}
                  className={[
                    "block rounded-2xl px-5 py-3 text-center text-sm font-semibold transition",
                    plan.featured
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-blue-300",
                  ].join(" ")}
                >
                  {plan.ctaLabel}
                </Link>
                {plan.ctaSupportingText ? (
                  <p className="text-xs leading-6 text-slate-400">{plan.ctaSupportingText}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-[2rem] border border-slate-800 bg-slate-900/60 p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Why Upgrade</p>
          <h2 className="mt-3 text-3xl font-black text-white">Launch Planner is for developers who want to keep moving after the first rough estimate.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Starter is the easiest way to get your first numbers. Launch Planner is for the moment you want saved work, a clearer dashboard workflow, and stronger decision-making around launch and concept direction.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {upgradeReasons.map((reason) => (
              <article key={reason.title} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-lg font-black text-white">{reason.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{reason.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

