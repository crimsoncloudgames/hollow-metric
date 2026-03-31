import Link from "next/link";

const resources = [
  {
    title: "Steam Positioning Guide",
    body: "Learn how to explain what your game is quickly enough for the right players to understand it.",
  },
  {
    title: "Short Description Checklist",
    body: "Use a simple checklist to make sure your short description leads with gameplay instead of vague tone.",
  },
  {
    title: "Competitor Mapping Notes",
    body: "A practical way to compare your store page against the games players are most likely to cross-shop.",
  },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 flex items-center justify-between">
          <Link href="/landing" className="text-2xl font-black italic text-blue-500">Hollow Metric</Link>
          <Link href="/signup?next=%2Fdashboard" className="rounded-full border border-blue-500 px-5 py-2 font-semibold text-blue-300 transition hover:bg-blue-600 hover:text-white">Create Account</Link>
        </div>

        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Resources</p>
          <h1 className="mb-4 text-4xl font-black text-white">Useful guidance for better Steam-page decisions.</h1>
          <p className="text-lg leading-8 text-slate-400">This is a simple starting point for the resources section. It gives the landing page a real destination for trust-building and SEO support.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {resources.map((resource) => (
            <article key={resource.title} className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-semibold text-white">{resource.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">{resource.body}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
