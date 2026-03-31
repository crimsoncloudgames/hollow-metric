"use client";

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

const productPillars = [
  {
    title: "Store page audit",
    body: "Review the parts of your Steam page that shape first impressions, from the short description to the way the page frames your game.",
  },
  {
    title: "Positioning feedback",
    body: "See whether your game is being explained clearly enough for the right players to understand it fast.",
  },
  {
    title: "Competitor discovery",
    body: "Find the closest market neighbors your page is actually competing against instead of relying on guesswork.",
  },
  {
    title: "Copywriting feedback",
    body: "Get direct notes on vague hooks, weak wording, and missing gameplay language that hurts clarity.",
  },
  {
    title: "Discoverability issues",
    body: "Spot missing tags, mixed signals, and weak points that reduce how clearly your page is categorized.",
  },
];

const audienceGroups = [
  "Indie developers preparing for launch",
  "Solo developers who also have to own the store page",
  "Small studios tightening messaging before release",
  "Teams improving an existing Steam page that is underperforming",
];

const workflowSteps = [
  "Paste your Steam URL.",
  "Hollow Metric analyzes the page, copy, and market signals.",
  "Get an actionable report with clearer next steps.",
];

const coreBenefits = [
  "Better positioning",
  "Clearer store page messaging",
  "Better tag and genre alignment",
  "Competitor awareness",
  "Fewer blind spots before launch",
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    cadence: "/month",
    blurb: "Start with a limited preview to see one immediate fix and one suggested tag.",
    items: ["Limited preview", "One feedback insight", "One tag recommendation"],
  },
  {
    name: "Pro",
    price: "$29",
    cadence: "/month",
    blurb: "Unlock full store-page audits, saved reports, and a deeper competitive view.",
    items: ["Full audit", "Saved reports", "Competitor set"],
    featured: true,
  },
  {
    name: "Pay Per Audit",
    price: "$12",
    cadence: "/audit",
    blurb: "Best for milestone check-ins when you only need a sharp read at key moments.",
    items: ["Single deep audit", "One-off purchase", "No subscription required"],
  },
];

const resourceCards = [
  {
    title: "Steam Positioning Guide",
    body: "A practical guide for explaining what your game is and why the right player should care.",
  },
  {
    title: "Short Description Checklist",
    body: "A fast way to evaluate whether your short description leads with gameplay instead of vague mood.",
  },
  {
    title: "Competitor Mapping Notes",
    body: "A grounded framework for comparing your page against the games players are likely to cross-shop.",
  },
];

const faqs = [
  {
    question: "What does Hollow Metric analyze?",
    answer: "Hollow Metric reviews store-page copy, positioning signals, competitor overlap, discoverability clues, and messaging weak spots before launch.",
  },
  {
    question: "Is this only for Steam?",
    answer: "Right now the product is focused on Steam because that is where the page language, tags, and competitor context are being evaluated.",
  },
  {
    question: "Do I need an account?",
    answer: "You can get a limited preview without an account. You need an account to unlock the full report and save audits.",
  },
  {
    question: "Is there a free version?",
    answer: "Yes. The free preview shows one actionable note and one suggested tag so users can understand the value before upgrading.",
  },
  {
    question: "How accurate is competitor matching?",
    answer: "The goal is to surface realistic adjacent games that help you make better store-page decisions. It is a decision-support tool, not a claim of perfect certainty.",
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

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">{eyebrow}</p>
      <h2 className="mb-4 text-3xl font-black leading-tight text-white md:text-4xl">{title}</h2>
      <p className="text-lg leading-8 text-slate-400">{body}</p>
    </div>
  );
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
        (el as HTMLElement).style.transition = "opacity 0.8s cubic-bezier(.4,0,.2,1), transform 0.8s cubic-bezier(.4,0,.2,1)";
        (el as HTMLElement).style.opacity = "1";
        (el as HTMLElement).style.transform = "translateY(0)";
      }, 160 + i * 120);
    });
  }, []);

  const previewTag = preview?.suggestedTags?.[0] ?? "Discoverability";
  const previewFeedback = preview?.storeAudit?.shortDesc?.feedback ?? "Lead with clearer gameplay language in your short description.";
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

      if (!response.ok) {
        throw new Error("Could not generate a preview right now.");
      }

      const data = (await response.json()) as TeaserAuditResult;
      setPreview(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate a preview right now.";
      setPreviewError(message);
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <main id="top" className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.24),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_65%,_rgba(30,64,175,0.28)_100%)]" />
        <div className="absolute -left-20 top-8 h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-3xl animate-float" />
        <div className="absolute right-[-10%] top-24 h-[340px] w-[340px] rounded-full bg-cyan-400/10 blur-3xl animate-float2" />
        <div className="absolute bottom-[-8%] left-[12%] h-[320px] w-[520px] rounded-full bg-blue-800/20 blur-3xl animate-float3" />
        <svg className="absolute bottom-0 left-0 h-[220px] w-[760px] opacity-40 blur-[1px] animate-steam-graph-move" viewBox="0 0 760 220" fill="none">
          <line x1="40" y1="24" x2="40" y2="200" stroke="#334155" strokeWidth="2" />
          <line x1="40" y1="200" x2="720" y2="200" stroke="#334155" strokeWidth="2" />
          <polyline points="40,180 120,142 200,146 280,96 360,112 440,72 520,88 600,44 680,68 720,54" stroke="#38bdf8" strokeWidth="4" fill="none" />
          <polyline points="40,194 120,170 200,178 280,136 360,142 440,112 520,124 600,88 680,98 720,92" stroke="#2563eb" strokeWidth="3" fill="none" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mt-4 flex items-center justify-between rounded-full border border-slate-800/80 bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <Link href="/landing" className="flex items-center gap-3">
            <div>
              <span className="text-2xl font-black italic tracking-tight text-blue-500">Hollow Metric</span>
              <p className="text-[10px] font-medium leading-none text-slate-500 mt-0.5">A tool by Crimson Cloud Games</p>
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-400">v0.3.3</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href="/pricing" className="transition hover:text-blue-400">Pricing</Link>
            <Link href="/resources" className="transition hover:text-blue-400">Resources</Link>
            <Link href="/login?next=%2Fdashboard" className="transition hover:text-blue-400">Login</Link>
            <Link href="/signup?next=%2Fdashboard" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">Sign Up</Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/login?next=%2Fdashboard" className="text-sm font-semibold text-slate-200">Login</Link>
            <Link href="/signup?next=%2Fdashboard" className="rounded-full border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-300">Sign Up</Link>
          </div>
        </header>

        <section className="fade-in grid grid-cols-1 gap-10 pt-16 pb-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:pt-24">
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.35em] text-blue-400">Steam Store Positioning Intelligence</p>
            <h1 className="hero-glow max-w-4xl text-4xl font-black italic leading-[0.95] text-white sm:text-5xl lg:text-7xl">
              See what your Steam page is saying before the algorithm says it for you.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Hollow Metric helps indie developers improve Steam positioning and store-page performance with practical feedback on copy, competitors, discoverability, and the weak points that cost attention before launch.
            </p>

            <form onSubmit={handlePreview} className="mt-8 rounded-[2rem] border border-slate-800 bg-slate-900/70 p-3 shadow-[0_0_40px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <input
                  name="steamInput"
                  type="text"
                  placeholder="Paste your Steam URL for a free preview"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="h-14 flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 px-5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                />
                <button
                  type="submit"
                  disabled={isLoadingPreview || !input.trim()}
                  className="h-14 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingPreview ? "Generating Preview..." : "Get Free Preview"}
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <p>Get one actionable feedback point and one tag recommendation immediately.</p>
                <Link href="/pricing" className="font-semibold text-blue-400 transition hover:text-blue-300">See pricing</Link>
              </div>
            </form>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={signupPreviewHref} className="rounded-full bg-blue-600 px-6 py-3 text-center font-bold text-white transition hover:bg-blue-500">Start Full Audit</Link>
              <Link href="#product-preview" className="rounded-full border border-slate-700 px-6 py-3 text-center font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">View Example Output</Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Immediate output</p>
                <p className="mt-3 text-3xl font-black text-white">1 fast fix</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Know what to improve right away after pasting your Steam URL.</p>
              </div>
              <div className="rounded-3xl border border-blue-600/30 bg-blue-600/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Account unlock</p>
                <p className="mt-3 text-3xl font-black text-white">Full report</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">See the full competitor set, copy audit, and strategy readout.</p>
              </div>
              <div className="col-span-2 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">What happens after paste</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-sm font-semibold text-white">Short description check</p>
                    <p className="mt-2 text-sm text-slate-400">See whether the hook is clear and gameplay-led.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-sm font-semibold text-white">Tag direction</p>
                    <p className="mt-2 text-sm text-slate-400">Get one immediate discoverability angle worth testing first.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-sm font-semibold text-white">Upgrade path</p>
                    <p className="mt-2 text-sm text-slate-400">Unlock the full audit and save it inside your dashboard.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {(isLoadingPreview || previewError || preview) && (
          <section className="fade-in pb-10">
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/85 p-8 shadow-2xl backdrop-blur-xl">
              {isLoadingPreview && (
                <div className="rounded-3xl border border-blue-600/30 bg-blue-600/10 p-6">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Free Preview Running</p>
                  <h2 className="mb-2 text-2xl font-black text-white">Pulling one sharp takeaway from your page.</h2>
                  <p className="text-slate-300">We are checking the short description, tag direction, and market overlap now.</p>
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
                      <p className="mt-3 max-w-2xl text-slate-400">The preview is intentionally narrow. The full service expands this into a complete store audit with competitor set, copy breakdown, and strategic recommendations.</p>
                    </div>
                    <div className="min-w-[260px] rounded-3xl border border-blue-600/30 bg-blue-600/10 px-5 py-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Full Audit Unlocks</p>
                      <p className="text-sm text-slate-200">Full competitor discovery, broader copy feedback, strategic gap analysis, and a saved report in your dashboard.</p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <article className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Actionable Feedback</p>
                      <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">{previewStatus}</span>
                      <p className="mt-4 text-base leading-7 text-slate-200">{previewFeedback}</p>
                    </article>
                    <article className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Recommended Tag</p>
                      <div className="mb-4 inline-flex rounded-full border border-blue-600/40 bg-blue-600/10 px-4 py-2 text-sm font-black uppercase tracking-wider text-blue-300">{previewTag}</div>
                      <p className="text-slate-300 leading-7">This is one starting signal. The full audit shows whether the rest of your page supports that tag and where your positioning is fighting itself.</p>
                    </article>
                  </div>

                  <div className="mt-8 flex flex-col gap-6 border-t border-slate-800 pt-6 lg:flex-row lg:items-center lg:justify-between">
                    <p className="max-w-2xl text-slate-400">{preview.competitors?.[0]?.name ? `We already found competitor overlap with ${preview.competitors[0].name}. Sign in to see the full competitor set and save the report.` : "Sign in to unlock the full competitor set, deeper copy analysis, and the full strategy readout."}</p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Link href={signupPreviewHref} className="rounded-2xl bg-blue-600 px-6 py-3 text-center font-bold text-white transition hover:bg-blue-500">Unlock Full Audit</Link>
                      <Link href={loginPreviewHref} className="rounded-2xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-200 transition hover:border-blue-600 hover:text-blue-400">Log In To Continue</Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <section className="fade-in py-14">
          <SectionIntro
            eyebrow="What the Product Does"
            title="A sharper read on your Steam page before you commit to launch."
            body="Hollow Metric is built to help indie teams understand what their Steam page is actually communicating, where the message is muddy, and what to improve first."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {productPillars.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
                <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-blue-300">{item.title}</p>
                <p className="text-sm leading-7 text-slate-400">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fade-in grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionIntro
              eyebrow="Who It Is For"
              title="Built for developers who need clarity, not marketing theater."
              body="The product is aimed at teams making real Steam page decisions and trying to remove guesswork before a launch window or store-page refresh."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {audienceGroups.map((audience, index) => (
              <div key={audience} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Audience {index + 1}</p>
                <p className="text-lg font-semibold leading-8 text-white">{audience}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fade-in py-14">
          <SectionIntro
            eyebrow="How It Works"
            title="Simple input, practical output."
            body="The flow is intentionally direct: paste a URL, see a useful preview, then unlock the full report if you want the complete read."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <div key={step} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-600/40 bg-blue-600/10 text-sm font-black text-blue-300">0{index + 1}</div>
                <p className="text-lg font-semibold text-white">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fade-in py-14">
          <SectionIntro
            eyebrow="Core Benefits"
            title="The outcome is better launch judgment."
            body="The value is not a pretty dashboard by itself. The value is seeing where your current page is underselling the game or attracting the wrong expectations."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {coreBenefits.map((benefit) => (
              <div key={benefit} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-sm font-semibold text-slate-200">
                {benefit}
              </div>
            ))}
          </div>
        </section>

        <section id="product-preview" className="fade-in py-14">
          <SectionIntro
            eyebrow="Example Output"
            title="Make the result feel tangible before the user even signs up."
            body="This preview block is one of the most important parts of the page because it makes the output concrete instead of abstract."
          />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sample Audit</p>
                  <h3 className="mt-2 text-2xl font-black text-white">Store Page Snapshot</h3>
                </div>
                <div className="rounded-full border border-blue-600/30 bg-blue-600/10 px-4 py-2 text-sm font-black text-blue-300">Hollow Score 72</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-yellow-500/25 bg-yellow-500/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Short Description</p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">Warning: the hook describes tone but does not explain what the player actually does moment to moment.</p>
                </div>
                <div className="rounded-3xl border border-blue-600/25 bg-blue-600/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Tag Alignment</p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">Suggested tags: Precision, Difficult, Physics. Current page language only clearly supports one of them.</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Strategic Notes</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Positioning gap</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">The page signals challenge, but not enough mechanical specificity.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Competitor cluster</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">Adjacent titles skew toward hard-skill platformers and execution-heavy indies.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Next action</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">Rewrite the short description around verbs and player friction, then retest tags.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">What the full report adds</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
                  <p>Verified competitor matches with stronger context for genre, positioning, and market expectations.</p>
                  <p>More than a single copy note so users can fix both the hook and the broader page language.</p>
                  <p>A strategic gap readout that explains what the page is missing, not just what is wrong.</p>
                </div>
              </div>
              <div className="rounded-[2rem] border border-blue-600/30 bg-blue-600/10 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Critical conversion point</p>
                <p className="mt-3 text-lg font-semibold text-white">After pasting a Steam URL, users should instantly understand what kind of decision support they are getting.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="fade-in py-14">
          <SectionIntro
            eyebrow="Pricing Preview"
            title="Simple plans for now."
            body="These are placeholder plans, but the section makes the monetization shape visible and gives the nav somewhere real to go."
          />
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
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{plan.name}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="pb-1 text-slate-400">{plan.cadence}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{plan.blurb}</p>
                <div className="mt-6 space-y-3 text-sm text-slate-400">
                  {plan.items.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/pricing" className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">View full pricing page</Link>
          </div>
        </section>

        <section className="fade-in py-14">
          <SectionIntro
            eyebrow="Trust"
            title="Grounded, useful, and built for actual indie launch decisions."
            body="The trust signal here is honesty. No fake testimonials. No exaggerated claims. Just a clear explanation of what the product helps with."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <p className="text-lg font-semibold text-white">No fake certainty</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">Hollow Metric is decision support. It helps you see the page more clearly. It does not pretend to guarantee outcomes.</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <p className="text-lg font-semibold text-white">Built for indie constraints</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">The feedback is meant for small teams making real launch choices without a formal research department.</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <p className="text-lg font-semibold text-white">Useful before launch and after</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">Use it while preparing a new page or while tightening an existing one that is not landing clearly enough.</p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm italic text-slate-400">Designed by an indie developer for indie developers</p>
        </section>

        <section className="fade-in py-14">
          <SectionIntro
            eyebrow="Resources Preview"
            title="Useful supporting content helps trust and SEO."
            body="If the landing page is doing its job, users who are not ready to convert should still leave with a better understanding of Steam page positioning."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {resourceCards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-lg font-semibold text-white">{card.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{card.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/resources" className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">Browse all resources</Link>
          </div>
        </section>

        <section className="fade-in py-14">
          <SectionIntro
            eyebrow="FAQ"
            title="Answer the obvious objections directly."
            body="These are the questions a cautious developer will ask before trusting the product or the input box."
          />
          <div className="space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fade-in py-16">
          <div className="rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.22),rgba(15,23,42,0.92))] p-8 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Final CTA</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black text-white sm:text-4xl">Paste your Steam page and see what needs work before launch pressure makes the decision for you.</h2>
            <p className="mt-4 max-w-2xl text-slate-300">Start with the free preview if you want a fast signal. Create an account if you want the full audit and saved reports.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="#top" className="rounded-full bg-blue-600 px-6 py-3 text-center font-bold text-white transition hover:bg-blue-500">Analyze Your Steam Page</Link>
              <Link href="/signup?next=%2Fdashboard" className="rounded-full border border-slate-700 px-6 py-3 text-center font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">Create Account</Link>
            </div>
          </div>
        </section>

        <footer className="fade-in border-t border-slate-800 py-10 text-sm text-slate-400">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <p className="text-2xl font-black italic text-blue-500">Hollow Metric</p>
              <p className="mt-1 text-[11px] text-slate-500">A tool by Crimson Cloud Games</p>
              <p className="mt-3 max-w-md leading-7">A Steam page audit tool for indie developers who need clearer positioning, stronger copy, and fewer launch blind spots.</p>
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
        @keyframes steam-graph-move {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(24px); }
        }
        .animate-steam-graph-move {
          animation: steam-graph-move 12s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(12px); }
        }
        .animate-float2 {
          animation: float2 4.5s ease-in-out infinite;
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .animate-float3 {
          animation: float3 5.3s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
