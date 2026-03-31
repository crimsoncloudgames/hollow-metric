import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/landing" className="text-2xl font-black italic text-blue-500">Hollow Metric</Link>
        <p className="mt-8 mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Terms</p>
        <h1 className="text-4xl font-black text-white">Terms placeholder</h1>
        <p className="mt-6 leading-8 text-slate-400">This placeholder page exists so the landing page footer has a real destination. Replace it with your actual terms before launch.</p>
      </div>
    </main>
  );
}
