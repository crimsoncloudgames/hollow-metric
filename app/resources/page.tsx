import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";

const educationPreviews = [
  {
    title: "How many copies does your indie game need to sell to break even?",
    body: "Learn how budget, price, platform fees, taxes, and revenue assumptions combine into a realistic break-even target.",
    status: "Coming soon",
  },
  {
    title: "How to choose a launch price for your Steam game",
    body: "Understand why launch price affects sales targets, player expectations, discount strategy, and how your game compares to similar titles.",
    status: "Coming soon",
  },
  {
    title: "Hidden costs indie developers forget to budget for",
    body: "A practical checklist for art, audio, tools, contractors, marketing, store fees, localization, QA, and other launch expenses.",
    status: "Coming soon",
  },
  {
    title: "Why wishlists do not automatically mean profit",
    body: "Wishlists can help, but they do not replace break-even math. Learn how to think about conversion, price, and revenue risk.",
    status: "Coming soon",
  },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PublicSiteHeader />

        <div className="mb-12 mt-10 max-w-4xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">EDUCATION</p>
          <h1 className="mb-4 text-4xl font-black text-white">Education for indie game launch planning</h1>
          <p className="text-lg leading-8 text-slate-400">Practical guides for understanding break-even targets, launch pricing, budgets, and financial decisions before you release your game.</p>
        </div>

        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-black text-white">Learn the decision logic behind launch math</h2>
          <p className="max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Hollow Metric is not just a calculator. It is built around a simple idea: indie developers make better launch decisions when they can see how budget, price, platform cuts, taxes, and sales targets connect.
          </p>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            These guides will help you understand the decisions behind the numbers before you commit to a launch plan.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-white">Guide previews</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {educationPreviews.map((preview) => (
              <article key={preview.title} className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
                <p className="inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                  {preview.status}
                </p>
                <h3 className="mt-4 text-lg font-black text-white">{preview.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">{preview.body}</p>
              </article>
            ))}
          </div>
        </div>

        <section className="rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.18),rgba(15,23,42,0.92))] p-8 text-center shadow-[0_0_32px_rgba(37,99,235,0.12)]">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">APPLY THE GUIDES</p>
          <h2 className="mt-3 text-3xl font-black text-white">Use the guides, then test your own numbers</h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            The articles explain the thinking. Hollow Metric lets you apply that thinking to your own game by testing budgets, price points, and break-even targets in one workflow.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/signup" className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500">
              Build Your Free Break-Even Model
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

