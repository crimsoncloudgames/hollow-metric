"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type TeaserAuditResult = {
  suggestedTags?: string[];
  competitors?: Array<{ name: string }>;
  storeAudit?: {
    shortDesc?: {
      status?: string;
      feedback?: string;
    };
  };
};

const pricingPlans = [
  {
    name: "Free Preview",
    price: "$0",
    featured: false,
    items: ["1 surfaced problem", "1 tag direction hint", "limited preview", "no credit card required"],
  },
  {
    name: "10 Credits",
    price: "$24",
    featured: true,
    items: ["use credits anytime", "full audit: 5 credits", "tag generator: 2 credits", "break-even analysis: 2 credits", "launch pack: 7 credits"],
  },
  {
    name: "25 Credits",
    price: "$49",
    featured: false,
    items: ["lower cost per use", "ideal for multiple revisions", "best for active launches"],
  },
];

const faqs = [
  {
    question: "What does this analyze?",
    answer: "Your Steam page, tags, and basic revenue assumptions.",
  },
  {
    question: "Do I need an account?",
    answer: "No for the preview. Yes for full results.",
  },
  {
    question: "Is this exact financial advice?",
    answer: "No. It is an estimate to help you plan.",
  },
];

function extractAppId(input: string) {
  const urlMatch = input.match(/store\.steampowered\.com\/app\/(\d+)/);
  const idMatch = input.match(/^(\d{5,10})$/);
  return urlMatch ? urlMatch[1] : idMatch ? idMatch[1] : "";
}

function buildAuthHref(pathname: "/login" | "/signup", submittedInput: string) {
  const nextPath = `/dashboard/new-audit?input=${encodeURIComponent(submittedInput)}`;
  return `${pathname}?next=${encodeURIComponent(nextPath)}`;
}

export default function LandingPage() {
  const [input, setInput] = useState("");
  const [submittedInput, setSubmittedInput] = useState("");
  const [preview, setPreview] = useState<TeaserAuditResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const sections = document.querySelectorAll(".fade-in");
    sections.forEach((el, i) => {
      (el as HTMLElement).style.opacity = "0";
      (el as HTMLElement).style.transform = "translateY(40px)";
      setTimeout(() => {
        (el as HTMLElement).style.transition =
          "opacity 0.8s cubic-bezier(.4,0,.2,1), transform 0.8s cubic-bezier(.4,0,.2,1)";
        (el as HTMLElement).style.opacity = "1";
        (el as HTMLElement).style.transform = "translateY(0)";
      }, 160 + i * 120);
    });
  }, []);

  const previewTag = preview?.suggestedTags?.[0] ?? "Discoverability";
  const previewFeedback =
    preview?.storeAudit?.shortDesc?.feedback ??
    "Lead with clearer gameplay language in your short description.";
  const previewStatus = preview?.storeAudit?.shortDesc?.status ?? "Warning";
  const signupPreviewHref = buildAuthHref("/signup", submittedInput || input.trim());
  const loginPreviewHref = buildAuthHref("/login", submittedInput || input.trim());

  const handlePreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setIsLoadingPreview(true);
    setPreviewError(null);
    setSubmittedInput(trimmedInput);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userGame: trimmedInput,
          isUrl: trimmedInput.includes("store.steampowered.com/app/"),
          appId: extractAppId(trimmedInput),
        }),
      });

      if (!response.ok) throw new Error("Could not generate a preview right now.");

      const data = (await response.json()) as TeaserAuditResult;
      setPreview(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not generate a preview right now.";
      setPreviewError(message);
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <main id="top" className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      {/* Background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.24),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_65%,_rgba(30,64,175,0.28)_100%)]" />
        <div className="absolute -left-20 top-8 h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-3xl animate-float" />
        <div className="absolute right-[-10%] top-24 h-[340px] w-[340px] rounded-full bg-cyan-400/10 blur-3xl animate-float2" />
        <div className="absolute bottom-[-8%] left-[12%] h-[320px] w-[520px] rounded-full bg-blue-800/20 blur-3xl animate-float3" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">

        {/* NAV */}
        <header className="sticky top-0 z-30 mt-4 flex items-center justify-between rounded-full border border-slate-800/80 bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <Link href="/landing" className="flex items-center gap-3">
            <Image
              src="/HM Logo Icon.webp"
              alt="Hollow Metric logo"
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl object-cover"
              priority
            />
            <div>
              <span className="text-2xl font-black italic tracking-tight text-blue-500">Hollow Metric</span>
              <p className="text-[10px] font-medium leading-none text-slate-500 mt-0.5">A tool by Crimson Cloud Games</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href="/pricing" className="transition hover:text-blue-400">Pricing</Link>
            <Link href="/resources" className="transition hover:text-blue-400">Resources</Link>
            <Link href="/login?next=%2Fdashboard" className="transition hover:text-blue-400">Login</Link>
            <Link href="/signup?next=%2Fdashboard" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">
              Sign Up
            </Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/login?next=%2Fdashboard" className="text-sm font-semibold text-slate-200">Login</Link>
            <Link href="/signup?next=%2Fdashboard" className="rounded-full border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-300">
              Sign Up
            </Link>
          </div>
        </header>

        {/* SECTION 1: HERO */}
        <section className="fade-in pt-20 pb-16 text-center">
          <h1 className="hero-glow mx-auto max-w-4xl text-4xl font-black italic leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Your Steam page might be costing you wishlists.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Fix what players don&apos;t understand, improve your tags, and see how many copies you actually need to break even before you launch.
          </p>

          <form
            onSubmit={handlePreview}
            className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-slate-800 bg-slate-900/70 p-3 shadow-[0_0_40px_rgba(15,23,42,0.45)] backdrop-blur-xl"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                name="steamInput"
                type="text"
                placeholder="Paste your Steam page URL"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="h-14 flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 px-5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
              <button
                type="submit"
                disabled={isLoadingPreview || !input.trim()}
                className="h-14 rounded-2xl bg-blue-600 px-7 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingPreview ? "Checking..." : "Check My Steam Page"}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">Instant preview. No signup required.</p>
          </form>
        </section>

        {/* Dynamic preview result */}
        {(isLoadingPreview || previewError || preview) && (
          <section className="fade-in pb-10">
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-8 shadow-2xl backdrop-blur-xl">
              {isLoadingPreview && (
                <div className="rounded-3xl border border-blue-600/30 bg-blue-600/10 p-6">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Checking your page</p>
                  <h2 className="mb-2 text-2xl font-black text-white">Pulling one sharp takeaway from your page.</h2>
                  <p className="text-slate-300">Checking the short description, tag direction, and market fit now.</p>
                </div>
              )}

              {previewError && (
                <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
                  <p className="mb-2 text-lg font-black text-white">Preview unavailable</p>
                  <p>{previewError}</p>
                </div>
              )}

              {preview && !isLoadingPreview && (
                <>
                  <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Free Preview</p>
                      <h2 className="text-3xl font-black text-white">Here is the first thing to fix.</h2>
                      <p className="mt-3 max-w-2xl text-slate-400">
                        This is a narrow preview. A full audit expands this into a complete store
                        review with copy breakdown, tags, and break-even numbers.
                      </p>
                    </div>
                    <div className="min-w-[240px] rounded-3xl border border-blue-600/30 bg-blue-600/10 px-5 py-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Full Audit Unlocks</p>
                      <p className="text-sm text-slate-200">
                        Complete copy audit, tag analysis, break-even estimate, and saved reports.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <article className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Feedback</p>
                      <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">
                        {previewStatus}
                      </span>
                      <p className="mt-4 text-base leading-7 text-slate-200">{previewFeedback}</p>
                    </article>
                    <article className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Recommended Tag</p>
                      <div className="mb-4 inline-flex rounded-full border border-blue-600/40 bg-blue-600/10 px-4 py-2 text-sm font-black uppercase tracking-wider text-blue-300">
                        {previewTag}
                      </div>
                      <p className="text-slate-300 leading-7">
                        This is one starting signal. The full audit shows whether the rest of your
                        page supports this tag and where your messaging is working against you.
                      </p>
                    </article>
                  </div>

                  <div className="mt-8 flex flex-col gap-6 border-t border-slate-800 pt-6 lg:flex-row lg:items-center lg:justify-between">
                    <p className="max-w-2xl text-slate-400">
                      {preview.competitors?.[0]?.name
                        ? `We found competitor overlap with ${preview.competitors[0].name}. Sign in to see the full set.`
                        : "Sign in to unlock the full audit, competitor set, and your break-even estimate."}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Link href={signupPreviewHref} className="rounded-2xl bg-blue-600 px-6 py-3 text-center font-bold text-white transition hover:bg-blue-500">
                        Unlock Full Audit
                      </Link>
                      <Link href={loginPreviewHref} className="rounded-2xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-200 transition hover:border-blue-600 hover:text-blue-400">
                        Log In
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* SECTION 2: PROBLEM */}
        <section className="fade-in py-20 border-t border-slate-800/60">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">
              If your page doesn&apos;t click, your game won&apos;t either.
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Players don't understand your game in seconds",
                "Your tags don't match how your game actually looks",
                "You're guessing your pricing and break-even",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-slate-300 text-lg leading-7">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-slate-500 italic">You don&apos;t notice this anymore. New players do.</p>
          </div>
        </section>

        {/* SECTION 3: WHAT YOU GET */}
        <section className="fade-in py-20 border-t border-slate-800/60">
          <h2 className="mb-10 text-3xl font-black text-white md:text-4xl">
            Three things that matter before launch
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Fix your Steam page",
                body: "See what's unclear and what needs to change.",
                accent: "border-slate-800",
              },
              {
                title: "Get better tags",
                body: "Based on how your game actually reads.",
                accent: "border-slate-800",
              },
              {
                title: "Know your numbers",
                body: "Estimate how many copies you need to break even.",
                accent: "border-blue-600/40 bg-blue-600/5",
              },
            ].map((card) => (
              <article
                key={card.title}
                className={`rounded-3xl border ${card.accent} bg-slate-900/60 p-7 backdrop-blur-sm`}
              >
                <p className="text-xl font-black text-white">{card.title}</p>
                <p className="mt-3 text-slate-400 leading-7">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 4: SAMPLE OUTPUT */}
        <section id="product-preview" className="fade-in py-20 border-t border-slate-800/60">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-white md:text-4xl">See what you&apos;ll actually get</h2>
            <div className="mt-4 flex flex-wrap gap-4 text-slate-400 text-sm">
              {["What's working", "What's confusing", "What to fix first"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sample Audit</p>
                  <h3 className="mt-2 text-2xl font-black text-white">Store Page Snapshot</h3>
                </div>
                <div className="rounded-full border border-blue-600/30 bg-blue-600/10 px-4 py-2 text-sm font-black text-blue-300">
                  Score 72 / 100
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-yellow-500/25 bg-yellow-500/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Short Description</p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">
                    Warning: the hook describes tone but does not explain what the player actually does moment to moment.
                  </p>
                </div>
                <div className="rounded-3xl border border-blue-600/25 bg-blue-600/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Tag Alignment</p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">
                    Suggested: Precision, Difficult, Physics. Current page language only supports one of them clearly.
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Fixes</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Clarity gap</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">The page signals challenge, not enough mechanical specificity.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Break-even</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">At $14.99 you need ~680 units to cover a $6k dev budget.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Next action</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">Rewrite the short description around verbs and player friction.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">Full audit includes</p>
                <div className="space-y-3 text-sm leading-7 text-slate-300">
                  <p>Complete copy notes across the whole page, not just the short description.</p>
                  <p>Tag review against how the page actually reads to new players.</p>
                  <p>Break-even calculator seeded from your price and estimated budget.</p>
                </div>
              </div>
              <div className="rounded-[2rem] border border-blue-600/30 bg-blue-600/10 p-6">
                <p className="text-lg font-black text-white mb-3">
                  Paste your URL and see your real issues in under a minute.
                </p>
                <Link
                  href="#top"
                  className="inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                  Check My Steam Page
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: PRICING */}
        <section className="fade-in py-20 border-t border-slate-800/60">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-white md:text-4xl">Start free. Buy credits when you need deeper answers.</h2>
            <p className="mt-3 max-w-2xl text-slate-400">Try the preview first. Unlock full launch feedback only when you need it.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={[
                  "rounded-[2rem] border p-6",
                  plan.featured
                    ? "border-blue-500/50 bg-blue-600/10 shadow-[0_0_32px_rgba(37,99,235,0.12)]"
                    : "border-slate-800 bg-slate-900/60",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{plan.name}</p>
                  {plan.featured && (
                    <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                      Best Value
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                </div>
                <ul className="mt-5 space-y-3 text-sm text-slate-400">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-[2rem] border border-blue-600/30 bg-blue-600/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Launch Pack = 7 credits</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">Includes full Steam page audit, tag generator, and break-even analysis.</p>
          </div>
        </section>

        {/* SECTION 6: FAQ */}
        <section className="fade-in py-20 border-t border-slate-800/60">
          <h2 className="mb-8 text-3xl font-black text-white md:text-4xl">Common questions</h2>
          <div className="space-y-4 max-w-3xl">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-base font-black text-white">{faq.question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 7: FINAL CTA */}
        <section className="fade-in py-16">
          <div className="rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.22),rgba(15,23,42,0.92))] p-10 text-center shadow-2xl">
            <h2 className="mx-auto max-w-2xl text-3xl font-black text-white sm:text-4xl">
              Fix what&apos;s costing you wishlists before you launch.
            </h2>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="#top"
                className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                Check My Steam Page
              </Link>
              <Link
                href="/signup?next=%2Fdashboard"
                className="rounded-full border border-slate-700 px-8 py-3 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="fade-in border-t border-slate-800 py-10 text-sm text-slate-400">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <p className="text-2xl font-black italic text-blue-500">Hollow Metric</p>
              <p className="mt-1 text-[11px] text-slate-500">A tool by Crimson Cloud Games</p>
              <p className="mt-3 max-w-md leading-7">
                Steam page audit, tag improvement, and break-even estimation for indie developers before launch.
              </p>
              <p className="mt-4 text-xs text-slate-500">Not affiliated with Valve or Steam.</p>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Navigation</p>
              <div className="space-y-2">
                <p><Link href="/pricing" className="transition hover:text-blue-400">Pricing</Link></p>
                <p><Link href="/resources" className="transition hover:text-blue-400">Resources</Link></p>
                <p><Link href="/login?next=%2Fdashboard" className="transition hover:text-blue-400">Login</Link></p>
                <p><Link href="/signup?next=%2Fdashboard" className="transition hover:text-blue-400">Sign Up</Link></p>
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Company</p>
              <div className="space-y-2">
                <p><Link href="/privacy" className="transition hover:text-blue-400">Privacy Policy</Link></p>
                <p><Link href="/terms" className="transition hover:text-blue-400">Terms</Link></p>
                <p><a href="mailto:support@hollowmetric.com" className="transition hover:text-blue-400">support@hollowmetric.com</a></p>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .hero-glow {
          text-shadow: 0 0 20px rgba(59, 130, 246, 0.45), 0 0 48px rgba(37, 99, 235, 0.22), 0 0 1px #fff;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes float2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(12px); }
        }
        .animate-float2 { animation: float2 4.5s ease-in-out infinite; }
        @keyframes float3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .animate-float3 { animation: float3 5.3s ease-in-out infinite; }
      `}</style>
    </main>
  );
}
