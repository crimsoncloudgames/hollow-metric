import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";

const resourceThemes = [
  {
    title: "Launch budget before launch spend",
    body: "Map contractors, marketing, QA, art, audio, and other real costs before they quietly turn into a bigger break-even problem.",
  },
  {
    title: "Break-even clarity, not guesswork",
    body: "Compare pricing scenarios and see how scope or spend changes reset the number of copies you need to sell.",
  },
  {
    title: "Spot launch risk before it gets expensive",
    body: "Use Hollow Metric to catch weak assumptions early so budget, pricing, and scope do not quietly push your break-even target higher.",
  },
];

const guides = [
  {
    title: "Pressure-test the downside first",
    body: "Indie plans usually break when costs drift, prices slip, or scope expands. Check the weaker scenario before you trust the optimistic one.",
  },
  {
    title: "Compare multiple paths, not one guess",
    body: "Good planning comes from testing more than one price point, budget scenario, or launch path before you lock one in.",
  },
  {
    title: "Build around indie reality",
    body: "Hollow Metric is built for indie developers and small teams making constrained decisions, not enterprise forecasting decks.",
  },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PublicSiteHeader />

        <div className="mb-12 mt-10 max-w-3xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">RESOURCES</p>
          <h1 className="mb-4 text-4xl font-black text-white">Practical guidance for indie developers making launch planning decisions.</h1>
          <p className="text-lg leading-8 text-slate-400">Use this page to think more clearly about launch budget, break-even pressure, pricing tradeoffs, and the risks that shape a real launch plan.</p>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-white">What Hollow Metric helps you think through</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {resourceThemes.map((resource) => (
              <article key={resource.title} className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-lg font-black text-white">{resource.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">{resource.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-white">Useful decision frameworks</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {guides.map((guide) => (
              <article key={guide.title} className="rounded-[2rem] border border-blue-600/30 bg-blue-600/5 p-6">
                <h3 className="text-lg font-black text-white">{guide.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{guide.body}</p>
              </article>
            ))}
          </div>
        </div>

        <section className="rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.18),rgba(15,23,42,0.92))] p-8 text-center shadow-[0_0_32px_rgba(37,99,235,0.12)]">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">USE THE PRODUCT</p>
          <h2 className="mt-3 text-3xl font-black text-white">Move from reading about launch decisions to testing your own.</h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            Use Hollow Metric to model budget, pressure-test break-even, and compare launch scenarios in one place. Launch Planner also includes 1 credit to try the Game Idea Generator if you want it.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/signup" className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500">
              Start Planning Smarter
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

