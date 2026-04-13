"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

const landingScreenshots = {
  gameIdeaGeneratorInputs: {
    src: "/images/landing/game-idea-generator-inputs.png",
    alt: "Hollow Metric Game Idea Generator inputs screen showing structured fields for genre, mechanics, setting, mood, twist, hook, and other concept inputs.",
    width: 2091,
    height: 1282,
  },
  gameIdeaGeneratorResults: {
    src: "/images/landing/game-idea-generator-results.png",
    alt: "Hollow Metric Game Idea Generator results screen showing two generated game ideas with positioning summaries.",
    width: 2127,
    height: 551,
  },
  breakEvenResults: {
    src: "/images/landing/break-even-results.png",
    alt: "Hollow Metric break-even results screen comparing launch price points, estimated net revenue per copy, and rough break-even copies needed.",
    width: 2131,
    height: 543,
  },
};

const valueBlocks = [
  {
    title: "Model your launch budget",
    body: "Plan art, audio, contractors, marketing, QA, and other costs in one place.",
  },
  {
    title: "Stress-test break-even",
    body: "Test different price points and see how many copies you need to sell.",
  },
  {
    title: "Catch risky decisions earlier",
    body: "Find out where your budget or pricing may be setting you up to fail.",
  },
];

const ideaGeneratorBenefits = [
  {
    title: "Start from a rough idea",
    body: "Bring a mechanic, hook, genre, setting, or mood and turn it into something more usable.",
  },
  {
    title: "Generate distinct directions",
    body: "Create multiple concept angles from one starting point so you can compare what feels stronger.",
  },
  {
    title: "Keep decisions in one workflow",
    body: "Take the stronger idea straight into the same product where you model price, budget, and break-even risk.",
  },
];

const bestFor = [
  {
    label: "Solo indie developers",
  },
  {
    label: "Small game teams planning a launch",
  },
  {
    label: "Developers refining concept direction before spending more",
  },
];

const faqs = [
  {
    question: "Why not just use a spreadsheet?",
    answer:
      "Spreadsheets work until budget, pricing, and scope start shifting. Hollow Metric keeps those decisions in one workflow so they are easier to compare, revisit, and trust.",
  },
  {
    question: "Does this guarantee sales?",
    answer:
      "No. Hollow Metric helps you test budget, break-even, and profitability using your own assumptions so you can make a clearer launch decision.",
  },
  {
    question: "Can I use it for free?",
    answer:
      "Yes. Start with the Free Launch Planner and try the core workflow before you upgrade.",
  },
  {
    question: "Are paid subscriptions live?",
    answer:
      "Yes. You can start free or upgrade to Launch Planner when you want saved projects, dashboard access, and a more serious planning workflow.",
  },
  {
    question: "Why charge credits for something and a subscription?",
    answer:
      "Launch Planner covers Hollow Metric's core planning workflow. AI features like the Game Idea Generator use credits because each run has a real per-use API cost. Launch Planner also includes 1 credit so you can test the flow.",
  },
];

const primaryFaqs = faqs.slice(0, 4);
const pricingFaq = faqs[4] ?? null;

export default function LandingPage() {
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

  return (
    <main id="top" className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.24),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_65%,_rgba(30,64,175,0.28)_100%)]" />
        <div className="absolute -left-20 top-8 h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-3xl animate-float" />
        <div className="absolute right-[-10%] top-24 h-[340px] w-[340px] rounded-full bg-cyan-400/10 blur-3xl animate-float2" />
        <div className="absolute bottom-[-8%] left-[12%] h-[320px] w-[520px] rounded-full bg-blue-800/20 blur-3xl animate-float3" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-30 mt-4 flex items-center justify-between rounded-full border border-slate-800/80 bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-6">
            <Link href="/landing" className="relative inline-block w-[min(62vw,18rem)] sm:w-[min(44vw,19rem)] md:w-[18rem]">
              <Image
                src="/HM logo icon with text webP.webp"
                alt="Hollow Metric"
                width={1200}
                height={300}
                style={{ width: "100%", height: "auto" }}
                priority
              />
              <p className="absolute bottom-[6%] left-[34%] whitespace-nowrap text-[8px] font-medium leading-none text-slate-500 sm:text-[9px] md:text-[10px]">
                A tool by Crimson Cloud Games
              </p>
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
              <Link href="/pricing" className="transition hover:text-blue-400">Pricing</Link>
              <Link href="/resources" className="transition hover:text-blue-400">Resources</Link>
              <Link href="/contact" className="transition hover:text-blue-400">Contact</Link>
              <Link href="/login" className="transition hover:text-blue-400">Login</Link>
              <Link href="/signup" className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500">
                Sign Up
              </Link>
            </nav>
            <div className="flex items-center gap-3 md:hidden">
              <Link href="/contact" className="text-sm font-semibold text-blue-300">Contact</Link>
              <Link href="/login" className="text-sm font-semibold text-slate-200">Login</Link>
              <Link href="/signup" className="rounded-full border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-300">Sign Up</Link>
            </div>
          </header>
        </div>

        <section className="fade-in px-4 pb-8 pt-12 text-center sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="mx-auto max-w-[100rem]">
            <div className="mx-auto max-w-[92rem]">
            <p className="mx-auto inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">
              Launch planning and concept shaping for indie game developers
            </p>
            <h1 className="hero-glow mx-auto mt-5 max-w-[84rem] text-4xl font-black leading-[1.04] tracking-[-0.02em] text-white sm:text-5xl lg:text-[4rem] xl:text-[4.7rem] 2xl:text-[5.15rem]">
              Plan your launch, test your break-even, and shape a stronger game idea.
            </h1>
            <p className="mx-auto mt-5 max-w-[68rem] text-base leading-8 text-slate-300 sm:text-lg">
              Model launch costs, compare break-even scenarios, and turn a rough concept into a clearer game direction before you spend more money.
            </p>

            <div className="mt-8 flex items-center justify-center">
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white transition hover:bg-blue-500 sm:w-auto"
              >
                Start Free
              </Link>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Start free. Upgrade later for saved projects and dashboard access.
            </p>
          </div>

          <article className="mx-auto mt-10 max-w-[90rem] rounded-[2rem] border border-slate-800 bg-slate-900/70 p-3 text-left shadow-[0_0_36px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-4">
            <div className="px-2 pb-4 pt-2 sm:px-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Real Product View</p>
              <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Build a game idea from real inputs, not a vague prompt box.</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
                Shape a direction with structured inputs for genre, player action, mechanics, features, setting, mood, twist, hook, audience angle, and perspective.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950">
              <Image
                src={landingScreenshots.gameIdeaGeneratorInputs.src}
                alt={landingScreenshots.gameIdeaGeneratorInputs.alt}
                width={landingScreenshots.gameIdeaGeneratorInputs.width}
                height={landingScreenshots.gameIdeaGeneratorInputs.height}
                priority
                sizes="(min-width: 1280px) 1152px, (min-width: 768px) 92vw, 96vw"
                className="h-auto w-full"
              />
            </div>
          </article>

          </div>

        </section>

        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">

        <section className="fade-in relative left-1/2 w-screen max-w-[96rem] -translate-x-1/2 border-t border-slate-800/60 px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto max-w-[88rem] text-left">
            <div className="max-w-4xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">AI Game Idea Generator</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-[2.85rem]">See the output quality before you even sign up.</h2>
              <p className="mt-4 max-w-[62rem] text-sm leading-7 text-slate-300 sm:text-base lg:text-[1.05rem]">
                Generate two distinct concept directions from one starting point, compare what feels stronger, and use that direction inside the same product you use for launch planning.
              </p>
            </div>

            <article className="mt-6 rounded-[2rem] border border-blue-600/25 bg-slate-900/70 p-3 shadow-[0_0_36px_rgba(37,99,235,0.12)] backdrop-blur-xl sm:p-4 lg:p-5">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950">
                <Image
                  src={landingScreenshots.gameIdeaGeneratorResults.src}
                  alt={landingScreenshots.gameIdeaGeneratorResults.alt}
                  width={landingScreenshots.gameIdeaGeneratorResults.width}
                  height={landingScreenshots.gameIdeaGeneratorResults.height}
                  sizes="(min-width: 1536px) 1408px, (min-width: 1280px) 1344px, (min-width: 768px) 92vw, 96vw"
                  className="h-auto w-full"
                />
              </div>
            </article>

            <div className="mt-6 grid gap-4 text-left md:grid-cols-3">
              {ideaGeneratorBenefits.map((item) => (
                <article key={item.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 lg:p-6">
                  <h3 className="text-lg font-black text-white lg:text-[1.7rem] lg:leading-[1.15]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300 lg:text-[1.02rem]">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fade-in relative left-1/2 w-screen max-w-[96rem] -translate-x-1/2 border-t border-slate-800/60 px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto max-w-[88rem] text-left">
            <div className="max-w-4xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Launch Planning Proof</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-[2.85rem]">See break-even results you can actually use.</h2>
              <p className="mt-4 max-w-[62rem] text-sm leading-7 text-slate-300 sm:text-base lg:text-[1.05rem]">
                Compare price points, estimated revenue per copy, and break-even targets before weak assumptions turn into expensive decisions.
              </p>
            </div>

            <article className="mt-6 rounded-[2rem] border border-blue-600/25 bg-slate-900/70 p-3 shadow-[0_0_36px_rgba(37,99,235,0.12)] backdrop-blur-xl sm:p-4 lg:p-5">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950">
                <Image
                  src={landingScreenshots.breakEvenResults.src}
                  alt={landingScreenshots.breakEvenResults.alt}
                  width={landingScreenshots.breakEvenResults.width}
                  height={landingScreenshots.breakEvenResults.height}
                  sizes="(min-width: 1536px) 1408px, (min-width: 1280px) 1344px, (min-width: 768px) 92vw, 96vw"
                  className="h-auto w-full"
                />
              </div>
            </article>

            <div className="mt-6 grid gap-4 text-left md:grid-cols-3">
              {valueBlocks.map((item) => (
                <article key={item.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                  <p className="text-lg font-black text-white">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fade-in border-t border-slate-800/60 py-10">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Best for</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                {bestFor.map((item) => (
                  <li key={item.label} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    {item.label}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-6 text-slate-500">
                Also useful for larger teams evaluating launch risk across multiple projects.
              </p>
            </article>

            <article className="rounded-[2rem] border border-blue-600/25 bg-blue-600/10 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Audience fit</p>
              <h2 className="mt-3 text-2xl font-black text-white">Built for practical launch planning, not enterprise forecasting.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Hollow Metric is built for indie developers and small teams planning a real launch, not enterprise BI or AAA forecasting.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Use it to turn rough assumptions into a clearer budget, break-even target, and next decision.
              </p>
            </article>
          </div>
        </section>

        <section className="fade-in border-t border-slate-800/60 py-10">
          <h2 className="mb-8 text-3xl font-black text-white md:text-4xl">Common questions</h2>
          <div className="max-w-5xl">
            <div className="grid gap-4 md:grid-cols-2">
              {primaryFaqs.map((faq) => (
                <article key={faq.question} className="flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                  <h3 className="text-base font-black text-white">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{faq.answer}</p>
                </article>
              ))}
            </div>

            {pricingFaq ? (
              <article className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-base font-black text-white">{pricingFaq.question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{pricingFaq.answer}</p>
              </article>
            ) : null}
          </div>
        </section>

        <section className="fade-in py-10">
          <div className="rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.22),rgba(15,23,42,0.92))] p-10 text-center shadow-2xl">
            <h2 className="mx-auto max-w-2xl text-3xl font-black text-white sm:text-4xl">
              Create your account and start making clearer launch decisions.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-200">
              Test your break-even, shape a stronger game idea, and move forward with a plan you can actually use.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                Create Free Account
              </Link>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-xs leading-6 text-slate-300">
              Launch Planner includes 1 credit so you can test the Game Idea Generator flow.
            </p>
          </div>
        </section>

        <p className="fade-in mt-0 pb-6 pt-0 text-center text-xs text-slate-500">Hollow Metric helps indie developers and small teams plan launch budgets, pressure-test break-even risk, and shape clearer game concepts.</p>

        <footer className="fade-in border-t border-slate-800 py-10 text-sm text-slate-400">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="relative inline-block w-[min(72vw,20rem)] sm:w-[min(52vw,19rem)] md:w-[18.75rem]">
                <Image src="/HM logo icon with text webP.webp" alt="Hollow Metric" width={1200} height={300} style={{ width: "100%", height: "auto" }} />
                <p className="absolute bottom-[6%] left-[34%] whitespace-nowrap text-[9px] font-medium leading-none text-slate-500 sm:text-[10px]">
                  A tool by Crimson Cloud Games
                </p>
              </div>
              <p className="mt-3 max-w-md leading-7">
                Hollow Metric helps indie developers and small teams plan launch budgets, test break-even decisions, and shape clearer game concepts.
              </p>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Navigation</p>
              <div className="space-y-2">
                <p><Link href="/pricing" className="transition hover:text-blue-400">Pricing</Link></p>
                <p><Link href="/resources" className="transition hover:text-blue-400">Resources</Link></p>
                <p><Link href="/contact" className="transition hover:text-blue-400">Contact</Link></p>
                <p><Link href="/login" className="transition hover:text-blue-400">Login</Link></p>
                <p><Link href="/signup" className="transition hover:text-blue-400">Free Launch Planner</Link></p>
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Company</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <p><Link href="/privacy" className="transition hover:text-blue-400">Privacy Policy</Link></p>
                  <p><Link href="/terms" className="transition hover:text-blue-400">Terms of Service</Link></p>
                  <p><Link href="/refunds" className="transition hover:text-blue-400">Refund Policy</Link></p>
                  <p><Link href="/cookies" className="transition hover:text-blue-400">Cookie Policy</Link></p>
                  <p><a href="https://www.facebook.com/hollowmetric" target="_blank" rel="noopener noreferrer" className="transition hover:text-blue-400">Facebook</a></p>
                </div>
                <div className="space-y-2">
                  <p><a href="https://x.com/hollowmetric" target="_blank" rel="noopener noreferrer" className="transition hover:text-blue-400">X</a></p>
                  <p><a href="https://bsky.app/profile/hollowmetric.bsky.social" target="_blank" rel="noopener noreferrer" className="transition hover:text-blue-400">Bluesky</a></p>
                  <p><a href="https://discord.gg/tQMqtQAsz9" target="_blank" rel="noopener noreferrer" className="transition hover:text-blue-400">Discord</a></p>
                  <p><a href="mailto:support@hollowmetric.com" className="transition hover:text-blue-400">support@hollowmetric.com</a></p>
                </div>
              </div>
            </div>
          </div>
        </footer>
        </div>
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

