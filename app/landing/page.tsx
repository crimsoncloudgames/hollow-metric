"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

const exampleMetrics = [
  {
    label: "Launch budget",
    value: "$25,500",
  },
  {
    label: "Game price",
    value: "$14.99",
  },
  {
    label: "Break-even",
    value: "2,430 copies",
  },
];

const valueBlocks = [
  {
    title: "Estimate your launch budget",
    body: "Plan art, audio, contractors, marketing, QA, and other costs in one place.",
  },
  {
    title: "See your break-even copies",
    body: "Test different price points and see how many copies you need to sell.",
  },
  {
    title: "Spot risky assumptions early",
    body: "Find out where your budget or pricing may be setting you up to fail.",
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
    label: "Studios comparing budget vs expected sales",
  },
  {
    label: "Publishers reviewing project risk",
  },
];

const faqs = [
  {
    question: "Why not just use a spreadsheet?",
    answer:
      "You can, but most launch spreadsheets get harder to trust once budget, pricing, and assumptions start changing. Hollow Metric keeps those planning decisions in one flow.",
  },
  {
    question: "Does this guarantee sales?",
    answer:
      "No. Hollow Metric helps you estimate launch budget, break-even copies, and profitability using your own assumptions. It is a planning tool, not a sales guarantee.",
  },
  {
    question: "Can I use it free right now?",
    answer:
      "Yes. The Free Launch Planner is currently open for testing.",
  },
  {
    question: "Are paid subscriptions live yet?",
    answer:
      "No. Paid subscriptions are not live yet while billing setup is being finalized.",
  },
];

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

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
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
            <Link href="/resources" className="transition hover:text-blue-400">Resources</Link>
            <Link href="/contact" className="transition hover:text-blue-400">Contact</Link>
            <Link href="/login" className="transition hover:text-blue-400">Login</Link>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/contact" className="text-sm font-semibold text-blue-300">Contact</Link>
            <Link href="/login" className="text-sm font-semibold text-slate-200">Login</Link>
          </div>
        </header>

        <section className="fade-in pt-14 pb-10 text-center">
          <p className="mx-auto inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">
            Launch planning for indie game developers and small teams
          </p>
          <h1 className="hero-glow mx-auto mt-6 max-w-5xl text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-7xl">
            Do you know how many copies your game needs to sell to break even?
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Hollow Metric helps indie game developers and small teams estimate launch budget, break-even copies, and profitability before they commit money.
          </p>

          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center justify-center">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white transition hover:bg-blue-500 sm:w-auto"
            >
              Try the Free Launch Planner
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Currently open for free testing. Paid subscriptions are not live yet.
          </p>

          <article id="example-result" className="mx-auto mt-10 max-w-4xl rounded-[2rem] border border-blue-600/30 bg-slate-900/75 p-6 text-left shadow-[0_0_32px_rgba(37,99,235,0.12)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Quick example result</p>
                <h2 className="mt-3 text-2xl font-black text-white">See the kind of planning answer the tool gives you fast.</h2>
              </div>
              <p className="text-sm text-slate-400">What one launch plan could look like</p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {exampleMetrics.map((metric) => (
                <div key={metric.label} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 text-center md:text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{metric.label}</p>
                  <p className="mt-3 text-2xl font-black text-white">{metric.value}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-300">
              One pricing mistake can add hundreds or thousands of extra sales to your break-even target.
            </p>
          </article>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 text-left md:grid-cols-3">
            {valueBlocks.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-lg font-black text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
              </article>
            ))}
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
                Not built for AAA forecasting or enterprise BI. Hollow Metric is designed for practical launch planning for indie and small-to-mid game teams.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The goal is simple: get from your current launch assumptions to a clearer budget, clearer break-even target, and a more useful next decision.
              </p>
            </article>
          </div>
        </section>

        <section className="fade-in border-t border-slate-800/60 py-10">
          <h2 className="mb-8 text-3xl font-black text-white md:text-4xl">Common questions</h2>
          <div className="max-w-3xl space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-base font-black text-white">{faq.question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="fade-in py-10">
          <div className="rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.22),rgba(15,23,42,0.92))] p-10 text-center shadow-2xl">
            <h2 className="mx-auto max-w-2xl text-3xl font-black text-white sm:text-4xl">
              Get to a useful launch answer before you commit more money.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-200">
              Start with the free planner, test your current assumptions, and see whether your launch plan still makes sense.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                Try the Free Launch Planner
              </Link>
            </div>
          </div>
        </section>

        <p className="fade-in mt-0 pb-6 pt-0 text-center text-xs text-slate-500">A launch planning tool for indie developers by an indie developer.</p>

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
                Financial planning and launch decision support for indie developers and small teams preparing for commercial release.
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
              <div className="space-y-2">
                <p><Link href="/privacy" className="transition hover:text-blue-400">Privacy Policy</Link></p>
                <p><Link href="/terms" className="transition hover:text-blue-400">Terms of Service</Link></p>
                <p><Link href="/refunds" className="transition hover:text-blue-400">Refund Policy</Link></p>
                <p><Link href="/cookies" className="transition hover:text-blue-400">Cookie Policy</Link></p>
                <p><a href="https://www.facebook.com/hollowmetric" target="_blank" rel="noopener noreferrer" className="transition hover:text-blue-400">Facebook</a></p>
                <p><a href="https://discord.gg/tQMqtQAsz9" target="_blank" rel="noopener noreferrer" className="transition hover:text-blue-400">Discord</a></p>
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

