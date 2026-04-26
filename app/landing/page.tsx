"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import PublicSiteHeader from "@/components/public-site-header";

const landingScreenshots = {
  breakEvenCost: {
    src: "/images/break-even-cost.png",
    alt: "Hollow Metric break-even cost inputs showing planned launch costs and pricing assumptions.",
    width: 2106,
    height: 625,
  },
  breakEvenResults: {
    src: "/images/break-even-results.png",
    alt: "Hollow Metric break-even results screen comparing price points, net revenue per copy, and rough break-even copies needed.",
    width: 2065,
    height: 518,
  },
  breakEvenReview: {
    src: "/images/break-even-review.png",
    alt: "Hollow Metric break-even planning review showing budget health score, sales target pressure, and cost structure signal.",
    width: 2066,
    height: 496,
  },
  competitorPricing: {
    src: "/images/landing/hm-screenshot-9.png.png",
    alt: "Hollow Metric competitor price comparison showing comparable Steam games and a suggested price range based on their original non-discounted list prices.",
    width: 2106,
    height: 720,
  },
};

const launchPlanningCards = [
  {
    eyebrow: "Break-Even Cost",
    title: "Start with the real cost of making your game",
    body: "Add art, audio, tools, contractors, marketing, and launch costs so your target is based on actual spending, not vibes.",
    cta: "Add Your Expenses",
    screenshot: landingScreenshots.breakEvenCost,
  },
  {
    eyebrow: "Price Point Selection",
    title: "See the sales target behind your price",
    body: "Hollow Metric turns your budget and price into a copies-needed target, so you can see whether your launch plan is realistic before you commit.",
    cta: "Start Setting Price Points",
    screenshot: landingScreenshots.breakEvenResults,
  },
  {
    eyebrow: "Planning Review",
    title: "Compare price points before launch",
    body: "Test different prices and see how they change your break-even target. A lower price and a higher price do not need the same sales volume.",
    cta: "Review My Budget",
    screenshot: landingScreenshots.breakEvenReview,
  },
  {
    eyebrow: "Competitor Pricing",
    title: "Check your price against real Steam competitors",
    body: "Use comparable games to sanity-check your minimum, maximum, and recommended launch price instead of copying random Steam prices.",
    cta: "Compare Competitor Prices",
    screenshot: landingScreenshots.competitorPricing,
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
      "You can, and many developers should start there. The problem is that spreadsheets get messy when your budget, price points, platform cuts, taxes, and sales targets keep changing. Hollow Metric keeps those decisions in one workflow so you can compare scenarios, revisit assumptions, and understand the break-even target faster.",
  },
  {
    question: "Does this guarantee sales?",
    answer:
      "No. Hollow Metric does not predict demand or guarantee revenue. It helps you pressure-test your launch assumptions so you can see what your budget and price imply before release.",
  },
  {
    question: "Can I use it for free?",
    answer:
      "Yes. You can start with the Free Launch Planner and build a basic break-even model before upgrading. Upgrade when you want saved projects, dashboard access, and deeper pricing tools.",
  },
  {
    question: "Are paid subscriptions live?",
    answer:
      "Yes. Launch Planner is available now for developers who want saved projects, dashboard access, and a more serious planning workflow.",
  },
  {
    question: "Why charge a subscription and also charge credits?",
    answer:
      "The subscription covers the core planning workflow, saved projects, and dashboard access. Credits are used for heavier tools with extra processing costs, such as competitor price analysis. This keeps the monthly plan lower while letting developers use those tools only when they need them.",
  },
];

const primaryFaqs = faqs;

export default function LandingPage() {
  const [activeScreenshot, setActiveScreenshot] = useState<null | (typeof launchPlanningCards)[number]>(null);

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
          <PublicSiteHeader />
        </div>

        <section className="fade-in px-4 pb-6 pt-10 text-center sm:px-6 sm:pb-8 sm:pt-12 lg:px-8 xl:px-10 2xl:px-12">
          <div className="mx-auto max-w-[100rem]">
            <div className="mx-auto max-w-[92rem]">
            <p className="mx-auto inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">
              Launch planning and break-even modeling for indie game developers
            </p>
            <h1 className="hero-glow mx-auto mt-5 max-w-[84rem] text-[2.65rem] font-black leading-[1.02] tracking-[-0.02em] text-white sm:text-5xl sm:leading-[1.04] lg:text-[4rem] xl:text-[4.7rem] 2xl:text-[5.15rem]">
              Know Exactly How Many Copies You Need to Sell to Break Even
            </h1>
            <p className="mx-auto mt-5 max-w-[68rem] text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Turn your budget, price points, and sales assumptions into a clear break-even target before you launch.
            </p>

            <div className="mt-8 flex items-center justify-center">
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white transition hover:bg-blue-500 sm:w-auto"
              >
                Build Your Free Break-Even Model
              </Link>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Start free. Upgrade later when you want saved projects, dashboard access, and competitor pricing tools.
            </p>
          </div>

          </div>

        </section>

        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">

        <section className="fade-in border-t border-slate-800/60 px-4 py-10 sm:px-6 lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2 lg:px-8 xl:px-10">
          <div className="mx-auto max-w-[88rem] text-left">
            <div className="max-w-4xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Launch Planning Workflow</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-[2.85rem]">Work through costs, price points, and planning review in one flow.</h2>
              <p className="mt-4 max-w-[62rem] text-sm leading-7 text-slate-300 sm:text-base lg:text-[1.05rem]">
                Move from expense inputs to price-point testing to planning review, so you can see how each decision changes your break-even target.
              </p>
              <p className="mt-3 max-w-[62rem] text-xs leading-6 text-slate-400 sm:text-sm">
                These are example outputs from the actual Hollow Metric workflow, showing how budget and price decisions change the break-even target.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {launchPlanningCards.map((card) => (
                <article key={card.title} className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-5 shadow-[0_0_36px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:p-6 lg:p-7">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)] lg:items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">{card.eyebrow}</p>
                      <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">{card.title}</h3>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{card.body}</p>
                      <div className="mt-6 flex items-center">
                        <Link
                          href="/signup"
                          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
                        >
                          {card.cta}
                        </Link>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveScreenshot(card)}
                      className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950 text-left transition hover:border-blue-500/50"
                      aria-label={`Open larger screenshot: ${card.title}`}
                    >
                      <Image
                        src={card.screenshot.src}
                        alt={card.screenshot.alt}
                        width={card.screenshot.width}
                        height={card.screenshot.height}
                        sizes="(min-width: 1280px) 46vw, (min-width: 768px) 92vw, 96vw"
                        className="h-auto w-full"
                      />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <article className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
              <h3 className="text-xl font-black text-white sm:text-2xl">Same budget. Different price. Very different target.</h3>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
                In this example, a $30,800 planned spend creates very different break-even targets depending on the launch price.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-2xl font-black text-white">$12.99</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">5,260 copies needed to roughly break even.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-2xl font-black text-white">$16.99</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">4,022 copies needed to roughly break even.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-2xl font-black text-white">$19.99</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">3,418 copies needed to roughly break even.</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-200">
                That is a 1,842-copy difference between the lowest and highest tested price.
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Example only. Your actual result depends on your own budget, revenue assumptions, platform fees, taxes, and launch price.
              </p>
            </article>
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
              <h2 className="mt-3 text-2xl font-black text-white">Built for practical indie launch planning, not vague forecasting.</h2>
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
          <div className="mx-auto w-full max-w-5xl">
            <h2 className="mb-8 text-3xl font-black text-white md:text-4xl">Common questions</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {primaryFaqs.map((faq) => (
                <article key={faq.question} className={["flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/60 p-6", faq.question.startsWith("Why charge a subscription") ? "md:col-span-2" : ""].join(" ").trim()}>
                  <h3 className="text-base font-black text-white">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fade-in py-10">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">One-Time Option</p>
            <div className="mt-3 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-black text-white sm:text-3xl">
                  Need someone to do the launch math for you?
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  If you do not want to build the plan yourself, get a one-time Hollow Metric Launch Math Audit. I will check your planned price, comparable games, break-even risk, estimated budget, and biggest concern, then email you a written report within 48 hours after payment.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-blue-500/20 bg-blue-600/10 p-5 text-left lg:text-center">
                <p className="text-sm font-semibold text-blue-200">One-time audit: $99</p>
                <Link
                  href="/launch-math-audit"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                  Get a Launch Math Audit
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="fade-in py-10">
          <div className="rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.22),rgba(15,23,42,0.92))] p-6 text-center shadow-2xl sm:p-8 lg:p-10">
            <h2 className="mx-auto max-w-2xl text-3xl font-black text-white sm:text-4xl">
              Build Your First Break-Even Plan for Free
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-200">
              Start with your own budget and price assumptions before upgrading.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                Start Planning Your Launch Now
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-blue-500 px-8 py-3 font-bold text-blue-200 transition hover:border-blue-400 hover:text-white"
              >
                Test Your Game&apos;s Profitability for Free
              </Link>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-xs leading-6 text-slate-300">
              Sign up for free and upgrade when you want saved projects and a more serious planning workflow.
            </p>
          </div>
        </section>

        <p className="fade-in mt-0 pb-6 pt-0 text-center text-xs text-slate-500">Hollow Metric helps indie developers and small teams plan launch budgets and pressure-test break-even risk.</p>

        <footer className="fade-in border-t border-slate-800 py-10 text-sm text-slate-400">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="relative inline-block w-[min(72vw,20rem)] sm:w-[min(52vw,19rem)] md:w-[18.75rem]">
                <Image src="/HM logo icon with text webP.webp" alt="Hollow Metric" width={1200} height={300} style={{ width: "100%", height: "auto" }} />
                <p className="absolute bottom-[6%] left-[34%] hidden whitespace-nowrap text-[10px] font-medium leading-none text-slate-500 sm:block">
                  A tool by Crimson Cloud Games
                </p>
              </div>
              <p className="mt-3 max-w-md leading-7">
                Hollow Metric helps indie developers and small teams plan launch budgets and test break-even decisions.
              </p>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Navigation</p>
              <div className="space-y-2">
                <p><Link href="/pricing" className="transition hover:text-blue-400">Pricing</Link></p>
                <p><Link href="/launch-math-audit" className="transition hover:text-blue-400">Launch Math Audit</Link></p>
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

      {activeScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-6"
          onClick={() => setActiveScreenshot(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded screenshot preview"
        >
          <div
            className="relative w-full max-w-6xl rounded-2xl border border-slate-700 bg-slate-950 p-3 sm:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveScreenshot(null)}
              className="absolute right-3 top-3 rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
              aria-label="Close screenshot preview"
            >
              Close
            </button>
            <Image
              src={activeScreenshot.screenshot.src}
              alt={activeScreenshot.screenshot.alt}
              width={activeScreenshot.screenshot.width}
              height={activeScreenshot.screenshot.height}
              sizes="(min-width: 1280px) 80vw, 96vw"
              className="h-auto max-h-[85vh] w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

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
