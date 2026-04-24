import Link from "next/link";
import type { Metadata } from "next";
import PublicSiteHeader from "@/components/public-site-header";

export const metadata: Metadata = {
  title: "Hidden costs indie developers forget to budget for | Hollow Metric",
  description:
    "A practical budgeting guide for indie game launches, including hidden costs that can shift break-even targets.",
  alternates: {
    canonical: "/resources/hidden-indie-game-budget-costs",
  },
};

export default function HiddenIndieGameBudgetCostsPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PublicSiteHeader />

        <article className="mx-auto mt-10 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">EDUCATION GUIDE</p>
          <h1 className="mt-3 text-4xl font-black text-white">Hidden costs indie developers forget to budget for</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Many indie game budgets start with obvious costs like art, music, and development tools. The problem is that launches often include smaller costs that add up quickly and change the real break-even target.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why indie budgets are usually too optimistic</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Most indie budgets begin as a rough production estimate and then stay mostly unchanged. Over time, teams add features, hit delays, outsource emergency tasks, or upgrade assets. Costs move, but the budget model often does not.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Optimism is understandable, especially when momentum is high. The risk is that an outdated budget can make your break-even target look lower than it really is. By launch, the team discovers the target too late, when runway is already tight.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Art, animation, UI, capsules, and store assets</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Art cost planning usually starts with in-game assets, but storefront and marketing visuals need budget too. Capsule variants, screenshots, key art, logos, trailer thumbnails, and social media visual sets all require time and specialist work.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              UI polish can also expand unexpectedly. Readability pass work, controller navigation, accessibility improvements, and iterative interface testing often happen near launch when the schedule is already compressed.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Audio, music, voice, and licensing</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Audio budgets are frequently underestimated because teams assume they can solve it late. In reality, custom music, mastering, implementation time, voice recording logistics, and revision rounds can create real cost pressure.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Licensing introduces additional complexity. Even when costs look small per asset, usage restrictions, renewal terms, and replacement work can add overhead. Building a licensing buffer into the budget is usually safer than treating these costs as one-time assumptions.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Tools, plugins, subscriptions, and engine-related costs</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Monthly tools are easy to ignore because each subscription feels minor. Across a full production cycle, design software, collaboration tools, asset libraries, automation services, analytics utilities, and build infrastructure can become meaningful line items.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Plugin dependencies can also multiply if you replace or extend systems mid-project. Even when plugin prices are manageable, migration and integration time has a cost. If the team tracks only license fees, the budget can still miss the true impact.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Contractors, QA, localization, trailers, and marketing</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Late-stage support is where many hidden costs appear. Contract QA, external bug triage, translation updates, trailer edits, paid ad tests, creator outreach support, and PR assets all compete for funds in the final push.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Localization is often under-scoped. Initial translation is one part, but patch updates and terminology consistency checks can continue after release. Marketing production has a similar pattern. A single trailer budget line rarely covers all cutdowns and variant formats needed across channels.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Platform fees, tax assumptions, refunds, and discounts</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Developers sometimes estimate break-even using list price against total cost, which can overstate expected return per copy. Platform deductions, tax treatment, refunds, and discount cadence all reduce average net revenue.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              These are not edge cases. They are normal parts of launch economics. If your budget model ignores them, your break-even math will likely look better on paper than in real storefront performance.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why missed costs change your break-even target</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Every added cost increases the amount your launch must recover. If you discover those costs late, your target can shift after key decisions are already locked. That can force reactive choices like rushed discounts, delayed support plans, or changes to roadmap scope.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              A realistic budget does not remove risk, but it gives you better control. You can evaluate tradeoffs earlier, set more credible goals, and avoid building strategy on incomplete numbers.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">How to build a budget you can revisit instead of a one-time guess</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Treat budgeting as a living model. Start with clear categories, then schedule regular checkpoints to update costs and assumptions. Add buffers for known volatility areas such as localization updates, asset revisions, and launch marketing.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Keep version history so you can compare changes over time. That helps you see when scope drift or timeline changes are driving cost growth. It also makes team discussions easier because everyone can reference the same current baseline.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Hollow Metric supports this style of planning by helping you convert revised budget assumptions into updated break-even targets. When costs move, your decision model should move too.
            </p>
          </section>

          <section className="mt-12 rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.18),rgba(15,23,42,0.92))] p-8 text-center shadow-[0_0_32px_rgba(37,99,235,0.12)]">
            <h2 className="text-3xl font-black text-white">Test your own launch assumptions</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              Hollow Metric lets you turn your own budget, price points, and revenue assumptions into a break-even target before launch.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signup" className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500">
                Build Your Free Break-Even Model
              </Link>
            </div>
          </section>

          <div className="pb-12 pt-8 text-center">
            <Link href="/resources" className="text-sm font-bold text-blue-300 transition hover:text-blue-200">
              Back to Education hub
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
