import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/landing" className="text-2xl font-black italic text-blue-500">Hollow Metric</Link>
        <p className="mt-8 mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Privacy Policy</p>
        <h1 className="text-4xl font-black text-white">Privacy & Cookie Policy</h1>
        <p className="mt-6 leading-8 text-slate-400">
          Hollow Metric uses essential cookies for authentication/session handling and optional cookies for feature preferences,
          analysis continuity, and product analytics.
        </p>

        <h2 className="mt-10 text-2xl font-black text-white">Cookie Categories</h2>
        <ul className="mt-4 space-y-3 text-slate-400 leading-7">
          <li>Essential: Required for login state, security checks, and preview-limit enforcement.</li>
          <li>Functional: Saves analysis preferences and recently analyzed Steam links.</li>
          <li>Analytics: Helps us understand usage patterns and improve product quality.</li>
          <li>Personalization: Enables tailored suggestions and returning-user convenience.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-black text-white">Retention</h2>
        <ul className="mt-4 space-y-3 text-slate-400 leading-7">
          <li>Free preview cookies: up to 24 hours.</li>
          <li>Session/auth state cookies: up to 7 days.</li>
          <li>Consent preference cookie: up to 180 days.</li>
        </ul>
      </div>
    </main>
  );
}
