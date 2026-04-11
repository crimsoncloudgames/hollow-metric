import Link from "next/link";

const resources = [
  {
    title: "Launch Budget Fundamentals",
    body: "Understand how to structure your launch budget, define your own cost assumptions, and calculate break-even targets for different price points.",
  },
  {
    title: "Break-Even Analysis Guide",
    body: "Learn how to read break-even numbers, compare multiple pricing scenarios, and spot when scope or spend changes reset your launch math.",
  },
  {
    title: "Cost Estimation Checklist",
    body: "Use a practical checklist to pressure-test budget assumptions, spot underfunded priorities, and catch wasteful spending before launch.",
  },
];

const guides = [
  {
    title: "Why Pricing Sensitivity Matters",
    body: "A small price change can add hundreds of sales to your break-even target. Learn why price decisions need to get tested before they are locked in.",
  },
  {
    title: "Scope Creep and Budget Drift",
    body: "How to spot when scope changes, feature delays, and late expenses quietly push your break-even target higher without obvious warning signs.",
  },
  {
    title: "Decision-Making with Uncertainty",
    body: "Your launch plan will be wrong. Learn how to build estimates that are realistic about that, and how to catch the parts that are most likely to break.",
  },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 flex items-center justify-between">
          <Link href="/landing" className="text-2xl font-black italic text-blue-500">Hollow Metric</Link>
          <Link href="/signup" className="rounded-full border border-blue-500 px-5 py-2 font-semibold text-blue-300 transition hover:bg-blue-600 hover:text-white">Create Account</Link>
        </div>

        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Resources</p>
          <h1 className="mb-4 text-4xl font-black text-white">Guidance for better launch planning decisions.</h1>
          <p className="text-lg leading-8 text-slate-400">Learn how to structure your launch budget, test pricing, and catch weak budget assumptions before expensive decisions are locked in.</p>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-black text-white">Core Concepts</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {resources.map((resource) => (
              <article key={resource.title} className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-lg font-black text-white">{resource.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">{resource.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-black text-white">Decision Frameworks</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {guides.map((guide) => (
              <article key={guide.title} className="rounded-[2rem] border border-blue-600/30 bg-blue-600/5 p-6">
                <h3 className="text-lg font-black text-white">{guide.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">{guide.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

