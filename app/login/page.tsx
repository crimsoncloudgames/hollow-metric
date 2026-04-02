export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 h-[42vh] max-h-[400px] w-[92vw] max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 opacity-10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/landing" className="cursor-pointer text-2xl font-black italic tracking-tight text-blue-500 sm:text-3xl hover:text-blue-400 transition">
            Hollow Metric
          </a>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 sm:text-sm">Launch Planning Suite</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <h1 className="text-2xl font-black text-white mb-4">Registration Temporarily Closed</h1>
          <p className="text-slate-400 text-sm mb-6">
            We're preparing Hollow Metric for launch. Sign in and registration will be available soon.
          </p>
          <p className="text-slate-500 text-xs mb-8 border border-slate-800 rounded-2xl px-4 py-3">
            In the meantime, check out our landing page to learn more about the tool.
          </p>
          <a
            href="/landing"
            className="inline-block rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-bold text-white transition"
          >
            Back to Landing Page
          </a>
        </div>
      </div>
    </main>
  );
}
