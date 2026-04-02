"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    featured: false,
    comingSoon: false,
    items: [
      "Calculator access only",
      "Basic financial inputs",
      "Basic break-even calculation",
      "No saved projects",
      "No premium dashboard features",
    ],
  },
  {
    name: "Launch Planner",
    price: "$12/mo",
    featured: true,
    comingSoon: false,
    items: [
      "Save financial projects",
      "Financial library",
      "Dashboard tracking",
      "Deeper financial analysis",
      "Better history and organization features",
    ],
  },
  {
    name: "MORE PLANS",
    price: "Coming Soon",
    featured: false,
    comingSoon: true,
    items: [
      "Additional options for studios and teams",
      "Expanded project capacity",
      "More advanced planning workflows",
      "Future premium features",
    ],
  },
];

const faqs = [
  {
    question: "What does Hollow Metric actually help me decide?",
    answer:
      "It helps you decide whether your launch budget and pricing assumptions make sense, how many copies you need to sell to break even, and whether your current plan is strong enough to support a commercial launch.",
  },
  {
    question: "How does break-even planning work?",
    answer:
      "You enter your current launch spend and compare up to three price points. Hollow Metric recalculates the required unit sales for each option so you can see exactly how a pricing change moves the target.",
  },
  {
    question: "Why not just use a spreadsheet?",
    answer:
      "Because most spreadsheets start useful and end outdated. Hollow Metric is built for launch decisions: price point comparison, automatic break-even updates, profitability planning, and clearer decision support without building and maintaining your own system from scratch.",
  },
  {
    question: "Why would I stay subscribed every month?",
    answer:
      "Because the risky part is not making the first plan. It is keeping the plan true as launch gets closer. Costs change, scope grows, pricing gets revisited, and late expenses show up. The subscription keeps your launch math current so you do not make decisions off stale numbers.",
  },
  {
    question: "Are the planning results guarantees?",
    answer:
      "No. Hollow Metric is a planning tool, not a guarantee engine. It helps you model assumptions and see how cost and pricing changes affect your break-even target before launch.",
  },
];

const heroCards = [
  {
    title: "Know whether your launch budget is realistic",
    body: "Keep planned costs in one place so budget changes are visible before they quietly raise your sales target.",
  },
  {
    title: "See what one price change does to break-even",
    body: "Compare price points before you commit and see how a small pricing move can add or remove hundreds of sales.",
  },
  {
    title: "Spot weak spend before it gets expensive",
    body: "Find underfunded priorities, wasteful categories, and shaky assumptions while they are still cheap to fix.",
  },
];

const problemPoints = [
  "Budgets get built from memory, old messages, and half-finished spreadsheets.",
  "Budget assumptions drift over time and no one notices until late.",
  "Price gets chosen before anyone knows how many copies the game needs to sell.",
  "Late changes push break-even higher while the plan still looks fine on paper.",
];

const featureCards = [
  {
    title: "See whether your budget still makes sense",
    body: "Keep your full launch spend in one place so bad assumptions do not hide across notes, messages, and stale sheets.",
    accent: "border-blue-600/40 bg-blue-600/5",
  },
  {
    title: "See what pricing does to break-even",
    body: "Test three price points side by side and see how fast the required unit sales move before the store price is set.",
    accent: "border-blue-600/40 bg-blue-600/5",
  },
  {
    title: "Plan around changing launch costs",
    body: "Update cost assumptions as scope changes so your break-even targets stay grounded in your own launch plan.",
    accent: "border-blue-600/40 bg-blue-600/5",
  },
  {
    title: "Find weak spend before it gets expensive",
    body: "Highlights underfunded priorities, weak assumptions, and budget areas that need a second look before launch.",
    accent: "border-blue-600/40 bg-blue-600/5",
  },
];

const subscriptionReasons = [
  "Update the plan the moment your budget or scope changes.",
  "Re-check break-even whenever pricing, timing, or costs shift.",
  "Compare multiple launch scenarios before you lock in the wrong one.",
  "Keep the numbers current so expensive decisions are not based on stale math.",
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
              width={300}
              height={70}
              className="h-auto w-full"
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
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/contact" className="text-sm font-semibold text-blue-300">Contact</Link>
            <Link href="/login" className="text-sm font-semibold text-slate-200">Login</Link>
            <Link href="/signup" className="rounded-full border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-300">
              Sign Up
            </Link>
          </div>
        </header>

        <section className="fade-in pt-14 pb-10 text-center">
          <p className="mx-auto inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">
            Built for indie developers and small game teams
          </p>
          <h1 className="hero-glow mx-auto mt-6 max-w-5xl text-4xl font-black italic leading-[1.02] text-white sm:text-5xl lg:text-7xl">
            Do you know how many copies your game needs to sell to break even?
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Estimate launch costs, test price points, and catch weak spending before bad assumptions turn into real losses.
          </p>

          <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white transition hover:bg-blue-500 sm:w-auto"
            >
              Build Your Launch Budget
            </Link>
            <Link
              href="#product-preview"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 px-7 py-4 text-sm font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300 sm:w-auto"
            >
              See Your Break-Even
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Know your sales target before launch costs and bad assumptions quietly reset it.
          </p>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left md:grid-cols-3">
            {heroCards.map((item) => (
              <article key={item.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-sm font-black uppercase tracking-[0.15em] text-blue-300">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-5 text-left lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-[0_0_40px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Why this matters</p>
              <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                Most expensive launch mistakes look harmless when you first approve them.
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-slate-300">
                The danger is rarely one dramatic failure. It is a stack of small decisions: a soft price, underestimated costs,
                late scope growth, and a budget that never got updated when reality changed.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Guessing</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">You approve spend without knowing what the full launch actually costs.</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Pricing blind</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">You choose a price before you know how hard that price makes break-even.</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Late fixes</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">You find weak assumptions after major decisions are made and the cheap fixes are gone.</p>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-blue-600/30 bg-blue-600/10 p-7 shadow-[0_0_32px_rgba(37,99,235,0.1)]">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Example outcome</p>
              <h2 className="mt-3 text-2xl font-black text-white">One pricing mistake can add nearly 1,000 extra sales to break-even.</h2>
              <div className="mt-6 space-y-4 text-sm leading-7 text-slate-200">
                <p>Planned budget: $25,500</p>
                <p>$12.99 price point: about 2,710 units to break even</p>
                <p>$16.99 price point: about 2,070 units to break even</p>
                <p>$19.99 price point: about 1,760 units to break even</p>
              </div>
              <p className="mt-6 border-t border-blue-500/20 pt-5 text-sm leading-7 text-slate-200">
                That gap is the danger. Pick the wrong price or keep stale assumptions, and the original launch math stops meaning anything.
              </p>
            </article>
          </div>
        </section>

        <section className="fade-in border-t border-slate-800/60 py-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">
              The real risk is not one bad decision. It is making five of them with stale numbers.
            </h2>
            <p className="mt-4 text-lg font-semibold leading-7 text-blue-300">
              Costs change. Scope changes. Pricing changes. If the math does not update with them, you are guessing with more confidence, not more clarity.
            </p>
            <ul className="mt-8 space-y-4">
              {problemPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-lg leading-7 text-slate-300">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="fade-in border-t border-slate-800/60 py-10">
          <h2 className="mb-6 text-3xl font-black text-white md:text-4xl">
            What you need before you spend more
          </h2>
          <p className="mb-8 max-w-3xl text-base font-semibold leading-7 text-blue-300">
            Know if your launch plan makes financial sense before you keep funding it.
          </p>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((card) => (
              <article
                key={card.title}
                className={`rounded-3xl border ${card.accent} bg-slate-900/60 p-7 backdrop-blur-sm`}
              >
                <p className="text-xl font-black text-white">{card.title}</p>
                <p className="mt-3 leading-7 text-slate-400">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="product-preview" className="fade-in border-t border-slate-800/60 py-10">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white md:text-4xl">How this works in practice</h2>
            <p className="mt-4 text-sm text-slate-400">
              Enter current spend • Compare 3 prices • Pressure test assumptions • Fix weak math
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Example Scenario</p>
                  <h3 className="mt-2 text-2xl font-black text-white">What one bad assumption does to launch math</h3>
                </div>
                <div className="rounded-full border border-blue-600/30 bg-blue-600/10 px-4 py-2 text-sm font-black text-blue-300">
                  Risk check
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-yellow-500/25 bg-yellow-500/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Inputs</p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">
                    <span className="block">Dev budget: $18,000</span>
                    <span className="block">Marketing: $4,500</span>
                    <span className="block">Launch services: $3,000</span>
                    <span className="block">Total planned spend: $25,500 before late scope increase.</span>
                  </p>
                </div>
                <div className="rounded-3xl border border-blue-600/25 bg-blue-600/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Price Points</p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">
                    Compare $12.99, $16.99, and $19.99 before store pricing is final and before soft pricing quietly inflates the target.
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Outputs</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Break-even units</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        <span className="block">$12.99: about 2,710 units</span>
                        <span className="block">$16.99: about 2,070 units</span>
                        <span className="block">$19.99: about 1,760 units</span>
                        <span className="block mt-2">The wrong price can add roughly 950 extra sales.</span>
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Cost planning check</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Shows how changing your own cost assumptions affects break-even targets and total launch risk.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Plan review</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Highlights underfunded categories, optimistic assumptions, and parts of the plan that need a second pass before launch.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Decision support includes</p>
                <div className="space-y-3 text-sm leading-7 text-slate-300">
                  <p>See where the money is really going instead of relying on scattered notes.</p>
                  <p>Keep break-even current when price, scope, or spend changes.</p>
                  <p>Catch weak assumptions and weak allocation before they get expensive.</p>
                </div>
              </div>
              <div className="rounded-[2rem] border border-blue-600/30 bg-blue-600/10 p-6">
                <p className="mb-3 text-lg font-black text-white">
                  Check your launch plan before the expensive decisions are already made.
                </p>
                <Link
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="inline-block rounded-full bg-slate-700 px-6 py-3 text-sm font-bold text-slate-400 cursor-not-allowed transition"
                >
                  Stress-Test Your Launch Math
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="fade-in border-t border-slate-800/60 py-10">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white md:text-4xl">Why this is worth keeping until launch</h2>
            <p className="mt-3 max-w-3xl text-slate-400">
              The point is not software access. The point is keeping your numbers real while launch costs, pricing, and scope keep shifting.
            </p>
          </div>
          <div>
            <div className="grid gap-5 lg:grid-cols-3">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={[
                    "rounded-[2rem] border p-6",
                    plan.comingSoon
                      ? "border-blue-500/35 bg-blue-950/20"
                      : "",
                    plan.featured
                      ? "border-blue-500/50 bg-blue-600/10 shadow-[0_0_32px_rgba(37,99,235,0.12)]"
                      : "border-slate-800 bg-slate-900/60",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{plan.name}</p>
                    {plan.featured && (
                      <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                        Recommended
                      </span>
                    )}
                    {plan.comingSoon && (
                      <span className="rounded-full border border-slate-600 bg-slate-800/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                        Not available yet
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className={plan.comingSoon ? "text-3xl font-black uppercase tracking-[0.08em] text-slate-200" : "text-4xl font-black text-white"}>
                      {plan.price}
                    </span>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm text-slate-400">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <article className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Why monthly makes sense</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  {subscriptionReasons.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-[2rem] border border-blue-600/30 bg-blue-600/10 p-6">
                <p className="text-lg font-black text-white">One bad assumption or one soft price can cost more than months of subscription.</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  If Hollow Metric helps you fix one weak budget assumption or avoid a price that pushes break-even too high, it has already paid for itself.
                </p>
              </article>
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">Additional plan options will be released over time.</p>
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
              Stop pricing and budgeting your launch on guesswork.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-200">
              Build the budget, stress-test assumptions, test pricing, and find weak math before bad decisions turn into real losses.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                Build Your Launch Budget
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-slate-700 px-8 py-3 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        <p className="fade-in mt-0 pb-6 pt-0 text-center text-xs text-slate-500">A launch planning tool for indie developers by an indie developer.</p>

        <footer className="fade-in border-t border-slate-800 py-10 text-sm text-slate-400">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="relative inline-block w-[min(72vw,20rem)] sm:w-[min(52vw,19rem)] md:w-[18.75rem]">
                <Image src="/HM logo icon with text webP.webp" alt="Hollow Metric" width={300} height={70} className="h-auto w-full" />
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
                <p><Link href="/signup" className="transition hover:text-blue-400">Sign Up</Link></p>
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">Company</p>
              <div className="space-y-2">
                <p><Link href="/privacy" className="transition hover:text-blue-400">Privacy Policy</Link></p>
                <p><Link href="/terms" className="transition hover:text-blue-400">Terms of Service</Link></p>
                <p><Link href="/refunds" className="transition hover:text-blue-400">Refund Policy</Link></p>
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

