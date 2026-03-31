export default function SettingsPage() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-3">Settings</p>
      <h2 className="text-2xl font-black text-white mb-3">Account & API Configuration</h2>
      <p className="text-slate-400 max-w-2xl">
        Manage your account preferences, authentication providers, and API key controls.
      </p>
    </section>
  );
}
