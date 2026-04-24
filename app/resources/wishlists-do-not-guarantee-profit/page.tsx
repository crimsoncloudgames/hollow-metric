import Link from "next/link";
import type { Metadata } from "next";
import PublicSiteHeader from "@/components/public-site-header";

export const metadata: Metadata = {
  title: "Why wishlists do not automatically mean profit | Hollow Metric",
  description:
    "Learn how to use wishlist data with conversion, pricing, and break-even assumptions before launch.",
  alternates: {
    canonical: "/resources/wishlists-do-not-guarantee-profit",
  },
};

export default function WishlistsDoNotGuaranteeProfitPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PublicSiteHeader />

        <article className="mx-auto mt-10 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">EDUCATION GUIDE</p>
          <h1 className="mt-3 text-4xl font-black text-white">Why wishlists do not automatically mean profit</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Wishlists are useful, but they are not the same as revenue. A game can have wishlists and still miss its financial target if price, conversion, discounts, and budget are not understood.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why wishlists matter</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Wishlists are one of the clearest early indicators that players are paying attention. They can help forecast launch interest, inform campaign timing, and support internal confidence that your concept is resonating.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              They also provide directional signal when testing trailers, storefront updates, festival participation, or creator outreach efforts. If wishlist velocity changes after a campaign, that is useful feedback for where attention is coming from.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why wishlists are not guaranteed sales</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              A wishlist is intent, not commitment. Some players wait for discounts, some lose interest, some are collecting games for later, and some will not buy in your launch window at all. Treating wishlist totals as guaranteed sales can create a risky plan.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              This does not reduce the value of wishlists. It clarifies how to use them. They are best used as one planning input alongside conversion assumptions, expected price realization, and break-even requirements.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why conversion rate matters</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Conversion rate connects wishlist volume to actual purchases. Two games with similar wishlist counts can have very different outcomes depending on store page quality, review momentum, genre fit, launch timing, and audience readiness.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Planning with a range is usually safer than a single fixed percentage. For example, a conservative, midpoint, and optimistic conversion scenario can show whether your launch remains financially viable under less favorable conditions.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why price and discounting matter</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Even strong conversion can miss financial goals if net revenue per copy is too low for your cost base. Price selection and discount cadence both influence how much each sale contributes to recovery.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Early discounts can support momentum and visibility, but they also change your average realized price. If your model assumes mostly full-price purchases while your strategy relies on discounts, your break-even estimate can become disconnected from reality.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why gross sales can still disappoint after platform cuts and taxes</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Gross sales numbers can look encouraging while net recovery remains below target. Platform cuts, taxes, refunds, and regional pricing effects all reduce how much revenue is available to cover development and launch costs.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              If your planning dashboard only tracks gross outcomes, you may think you are on pace while still underperforming on actual cost recovery. Building decisions around net assumptions gives a more honest picture of progress.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">Why break-even planning should happen before launch</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Pre-launch is when adjustments are cheapest. You can still tune scope, improve positioning, revise pricing assumptions, or reduce optional spend. After launch, many decisions become harder and more expensive to change.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              If you model break-even early, wishlist growth becomes easier to interpret. You can ask practical questions: Does this trajectory support our financial target at current pricing? Do we need a different launch window? Are we overestimating conversion?
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-black text-white">How to use wishlists as one input, not the whole plan</h2>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              A strong planning process combines wishlist data with budget reality and net revenue assumptions. Start with total planned spend. Add price scenarios. Add conversion ranges. Include expected discount behavior. Then test the unit targets that result.
            </p>
            <p className="text-sm leading-7 text-slate-300 sm:text-base">
              Hollow Metric helps structure this process so wishlist numbers sit in context rather than driving decisions alone. The goal is not to eliminate uncertainty. The goal is to make launch decisions with fewer blind spots and clearer tradeoffs.
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
