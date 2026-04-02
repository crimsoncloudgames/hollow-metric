type FeatureComingSoonCardProps = {
  supportingLine: string;
};

export default function FeatureComingSoonCard({
  supportingLine,
}: FeatureComingSoonCardProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
        <h2 className="text-3xl font-black text-white">Feature Coming Soon</h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          We&apos;re still building this part of Hollow Metric. It will be available in a future update.
        </p>

        <div className="mt-6 rounded-2xl border border-blue-600/25 bg-blue-600/10 p-5">
          <p className="text-sm font-semibold text-blue-100">{supportingLine}</p>
          <p className="mt-1 text-sm text-blue-300">Coming soon.</p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Current Build Focus
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>secure payment integration</li>
            <li>launch budget tools</li>
            <li>account and data protection</li>
          </ul>
        </div>

        <div className="mt-6">
          <button
            type="button"
            disabled
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-400 opacity-80"
          >
            Available Soon
          </button>
        </div>
      </div>
    </section>
  );
}
