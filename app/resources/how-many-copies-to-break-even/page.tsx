import Link from "next/link";
import type { Metadata } from "next";
import PublicSiteHeader from "@/components/public-site-header";

export const metadata: Metadata = {
  title: "How many copies does your indie game need to sell to break even? | Hollow Metric",
  description:
    "Understand break-even targets for indie games and how budget, price, platform cuts, taxes, refunds, and discounts affect copies needed.",
  alternates: {
    canonical: "/resources/how-many-copies-to-break-even",
  },
};

export default function HowManyCopiesToBreakEvenPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PublicSiteHeader />

        <article className="mx-auto mt-10 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">EDUCATION GUIDE</p>
          <h1 className="mt-3 text-4xl font-black text-white">How many copies does your indie game need to sell to break even?</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Your break-even target is the number of copies your game needs to sell before it has recovered its costs. For indie developers, this number can reveal whether a launch plan is realistic before money, time, and scope get out of control.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">What break-even means for an indie game</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Break-even is not an abstract finance term. It is a practical planning checkpoint. You estimate your total planned spend, estimate how much net revenue you keep per copy, then calculate how many units you need to recover that spend.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              For a solo developer or small team, this matters early. If your target is far above what similar games in your niche usually reach, that is a signal to revisit scope, launch price, production timeline, or marketing assumptions before you are deep into execution.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why copies sold matter more than gross revenue screenshots</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Developers often see launch posts that highlight gross revenue. Those screenshots can be motivating, but they are not enough for planning your own release. Gross numbers do not show platform cuts, refund impact, regional pricing effects, taxes, or discount timing.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Copies sold is not the full story either, but it is a useful bridge between your budget and your market reality. You can compare copy targets against genre benchmarks, community size, wishlist assumptions, and your marketing runway. That makes copies sold a practical decision metric, not just a vanity stat.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">The basic break-even logic</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              The core logic is simple:
            </p>
            <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 font-mono text-xs text-slate-200 sm:text-sm">
              Break-even copies = Total planned spend / Estimated net revenue per copy
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              The hard part is estimating net revenue per copy honestly. A listed price is not your net. Your net depends on platform fee assumptions, taxes, refund behavior, and how often sales happen at discounted prices.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why platform cuts, taxes, refunds, and discounts matter</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              If you build plans off list price, you can understate your break-even target. A $19.99 price point does not mean every copy contributes $19.99 to cost recovery. In practice, each copy contributes some smaller net amount after deductions and timing effects.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Discounts also change your average realized price over time. Many games rely on promotional windows to drive discovery and conversions. That can be a valid strategy, but your model should include it so you understand the resulting copies target. Planning with realistic net assumptions gives you a clearer range of outcomes.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why a small price change can create a large sales target change</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              A few dollars of price movement can produce a major shift in units required because every copy contributes a different net amount. The same budget can look manageable at one price and much harder at another.
            </p>
            <div className="rounded-3xl border border-blue-500/30 bg-blue-500/10 p-6">
              <h3 className="text-lg font-black text-white">Example</h3>
              <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                A $30,800 planned spend creates different break-even targets depending on price and estimated net revenue per copy.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-blue-100 sm:text-base">
                <li>At $12.99, the example target is about 5,260 copies.</li>
                <li>At $16.99, the example target is about 4,022 copies.</li>
                <li>At $19.99, the example target is about 3,418 copies.</li>
              </ul>
              <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
                This example is not a guarantee. Actual results depend on budget, platform fees, taxes, refunds, discounts, and the revenue assumptions you use.
              </p>
            </div>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              This is why break-even planning should happen before launch assets are finalized. If your copies target is too high for your current market position, you still have room to adjust scope, budget, or pricing strategy.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">How Hollow Metric helps you test this before launch</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Hollow Metric is built for scenario testing. You can plug in your current budget assumptions, test multiple launch prices, and review how the break-even copies target changes under different net revenue assumptions.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              That lets you compare options with less guesswork. You can evaluate whether a lower price requires more reach than you realistically expect, or whether a higher price requires quality and positioning support you still need to build.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              The result is not certainty. It is a clearer planning lens. For indie teams with limited time and cash runway, that clarity can prevent expensive late-stage surprises.
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
