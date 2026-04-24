import Link from "next/link";
import type { Metadata } from "next";
import PublicSiteHeader from "@/components/public-site-header";

export const metadata: Metadata = {
  title: "How to choose a launch price for your Steam game | Hollow Metric",
  description:
    "Learn how launch price affects break-even targets, positioning, discount strategy, and competitive context for indie Steam releases.",
  alternates: {
    canonical: "/resources/choose-steam-launch-price",
  },
};

export default function ChooseSteamLaunchPricePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PublicSiteHeader />

        <article className="mx-auto mt-10 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">EDUCATION GUIDE</p>
          <h1 className="mt-3 text-4xl font-black text-white">How to choose a launch price for your Steam game</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Choosing a launch price is not just about what feels fair. Your price affects your break-even target, player expectations, discount strategy, and how your game compares to similar titles.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why launch price is a financial decision, not only a marketing decision</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Pricing often gets treated as branding or messaging. That matters, but your price is also a hard financial input. It directly changes how many copies you need to sell to recover development and launch costs.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              If you decide price purely by feel, you risk setting a target that your expected audience size cannot support. A better process is to evaluate price as one part of a full launch model that includes budget, platform deductions, discounts, and conversion assumptions.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">How price changes the number of copies needed to break even</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              A higher list price can reduce units needed to recover costs if your net per copy improves. A lower list price can increase units needed even when conversion improves slightly. The relationship is rarely linear in real launches because discounts, tax treatment, and regional pricing pull the effective net price in different directions.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              This is why scenario testing matters. Compare multiple pricing options against the same budget and realistic net assumptions. If one option demands an unrealistic sales volume for your audience size, that is useful information before launch.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why similar Steam games matter</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Comparable titles help anchor your price in market reality. Players evaluate value relative to alternatives in your genre, scope tier, visual quality, and feature depth. If your price is far above similar games, you need a strong reason that players can understand quickly.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Looking at nearby titles can also reveal common pricing bands and discount behavior. That context helps you set expectations for launch performance and post-launch sale strategy.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why you should not blindly copy competitor prices</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Competitor pricing is context, not a script. Two games can look similar from a storefront screenshot while having very different cost structures, communities, wishlists, or marketing support. Copying another price without understanding your own break-even math can push you into a risky target.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Use competitor data to inform your range, then check each option against your own budget and sales assumptions. That keeps your decision grounded in your constraints, not somebody else’s launch conditions.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">How lower prices can increase required sales volume</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Lower prices can improve accessibility for buyers, but each copy contributes less toward cost recovery. That means your break-even units can climb fast unless higher conversion reliably offsets the lower net per copy.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              This tradeoff is especially important for teams with limited marketing reach. If your discovery pipeline is still small, a low price may force a sales volume that is hard to hit early.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">How higher prices can raise player expectations</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              A higher price can reduce break-even units on paper, but it can also raise scrutiny. Players may expect stronger polish, deeper content, broader feature sets, or clearer post-launch support.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              If your product and store presentation do not support those expectations, conversion can drop. In that case, the theoretical benefit of higher net per copy may not materialize. Pricing should match both your financial model and the value your audience can immediately recognize.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">A practical checklist before choosing a price</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-300 sm:text-base">
              <li>Estimate total planned spend, including pre-launch and post-launch essentials.</li>
              <li>Model net revenue per copy, not just list price.</li>
              <li>Compare at least three candidate prices and check break-even units for each.</li>
              <li>Review comparable Steam titles for scope, quality, and pricing bands.</li>
              <li>Stress-test discount assumptions instead of planning around full-price sales only.</li>
              <li>Check whether your projected audience size can realistically support each unit target.</li>
              <li>Revisit price if scope or budget changes before launch.</li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">How Hollow Metric helps with competitor pricing context</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Hollow Metric helps developers sanity-check pricing decisions. It does not choose the perfect launch price for you. Instead, it gives you a structured way to compare price scenarios, break-even targets, and competitor context in one place.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              That process helps you avoid one-input decisions. You can validate whether a planned price aligns with your expected net revenue, your cost base, and the market segment you are entering. For small teams, that can turn a vague pricing debate into a clear, testable decision.
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
