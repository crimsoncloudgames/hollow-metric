import Link from "next/link";
import type { Metadata } from "next";
import PublicSiteHeader from "@/components/public-site-header";

export const metadata: Metadata = {
  title: "How Hollow Metric Works | Hollow Metric",
  description:
    "Learn how Hollow Metric connects budget, price points, platform fees, taxes, competitor pricing context, and break-even targets for indie game launch planning.",
  alternates: {
    canonical: "/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PublicSiteHeader />

        <article className="mx-auto mt-10 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">TRUST AND TRANSPARENCY</p>
          <h1 className="mt-3 text-4xl font-black text-white">How Hollow Metric Works</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Hollow Metric helps indie developers turn launch assumptions into clearer planning numbers. It does not predict demand or guarantee sales. It shows how your own budget, price points, and revenue assumptions affect the break-even target for your game.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">The core idea</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Hollow Metric starts with a simple question: how many copies does this game need to sell before it has recovered its costs?
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              To answer that, the tool connects your planned spend, launch price, estimated net revenue per copy, and break-even target in one workflow. When one assumption changes, the target changes too.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">What goes into a break-even estimate</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              A break-even estimate is only as useful as the assumptions behind it. Hollow Metric is designed to make those assumptions visible instead of hiding them in scattered notes or a messy spreadsheet.
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300 sm:text-base">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>Planned development and launch costs</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>Launch price</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>Platform fees</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>Tax or withholding assumptions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>Discounts, refunds, and other revenue adjustments where relevant</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>Estimated net revenue per copy</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>Copies needed to recover the planned spend</span>
              </li>
            </ul>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why price changes the target</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              A higher launch price can reduce the number of copies needed to recover costs, but it can also raise player expectations. A lower launch price may feel safer, but it can require more sales volume to reach the same financial target.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Hollow Metric helps you compare those tradeoffs before launch so the pricing decision is not just based on instinct.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">How competitor pricing should be used</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Competitor price analysis is meant to provide context, not a perfect answer. Similar games can help you sanity-check your price range, but they cannot guarantee demand for your own game.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Hollow Metric uses competitor pricing as one input in the planning process. The final decision should still account for your scope, quality bar, audience, genre expectations, launch timing, and discount strategy.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">What Hollow Metric does not do</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Be direct about what the tool cannot promise.
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300 sm:text-base">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>It does not guarantee sales</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>It does not predict exact demand</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>It does not replace market research</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>It does not know your final product quality</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>It does not remove the risk of launching a game</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span>It does not make pricing decisions for you</span>
              </li>
            </ul>
            <p className="mt-5 text-sm leading-7 text-slate-300 sm:text-base">
              It gives you clearer numbers so you can make the decision with less guesswork.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why this matters before release</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Many indie developers discover the real financial target too late, after the scope, budget, or timeline has already grown. Hollow Metric is built to make that target visible earlier, while there is still time to adjust the plan.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Use it to pressure-test the launch before the launch pressure starts.
            </p>
          </section>

          <section className="mt-12 rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.18),rgba(15,23,42,0.92))] p-8 text-center shadow-[0_0_32px_rgba(37,99,235,0.12)]">
            <h2 className="text-3xl font-black text-white">Test your own launch assumptions</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              Build a free break-even model using your own budget, price points, and revenue assumptions.
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
