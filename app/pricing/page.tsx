"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useEffect } from "react";
import PublicSiteHeader from "@/components/public-site-header";

type PricingPlan = {
  name: string;
  price: string;
  featured: boolean;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  ctaSupportingText?: string;
  features: string[];
};

const plans: PricingPlan[] = [
  {
    name: "Free Launch Planner",
    price: "$0",
    featured: false,
    description: "Start with the core break-even workflow before upgrading.",
    ctaHref: "/signup",
    ctaLabel: "Start Free",
    features: [
      "Build a basic break-even model",
      "Test launch price assumptions",
      "See how many copies you may need to sell",
      "Upgrade when you want saved projects and deeper pricing tools",
    ],
  },
  {
    name: "Launch Planner",
    price: "$12/mo",
    description:
      "For indie developers who want to save, revisit, and pressure-test real launch decisions before release. Turn your budget, price points, break-even target, and competitor pricing context into one planning workflow you can return to.",
    featured: true,
    ctaHref: "/signup",
    ctaLabel: "Choose Launch Planner",
    ctaSupportingText:
      "Included monthly credits are for optional on-demand tools and do not roll over.",
    features: [
      "Save and revisit your launch budget projects",
      "Compare break-even targets across different price points",
      "Sanity-check your launch price against real Steam competitors",
      "Keep budget, sales target, and pricing context in one workflow",
      "Use included monthly credits for credit-based tools",
    ],
  },
];

const upgradeReasons = [
  {
    title: "Save work worth revisiting",
    body: "Keep launch assumptions, price tests, and budget plans in one place instead of rebuilding them every time.",
  },
  {
    title: "Compare launch decisions more seriously",
    body: "Track tradeoffs across budget, pricing, and break-even so you can make stronger launch decisions with less guesswork.",
  },
  {
    title: "Keep planning organized as your project grows",
    body: "Use Launch Planner when your launch plan is becoming more real and you need better structure than a one-off estimate.",
  },
];

const PRICING_VIEWED_STORAGE_KEY = "hm_last_pricing_viewed_at";
const PRICING_VIEWED_DEDUPE_MS = 1000;

export default function PricingPage() {
  useEffect(() => {
    const now = Date.now();
    const lastCapturedAt = Number(window.sessionStorage.getItem(PRICING_VIEWED_STORAGE_KEY) ?? "0");

    if (Number.isFinite(lastCapturedAt) && now - lastCapturedAt < PRICING_VIEWED_DEDUPE_MS) {
      return;
    }

    window.sessionStorage.setItem(PRICING_VIEWED_STORAGE_KEY, String(now));
    posthog.capture("pricing_viewed");
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <PublicSiteHeader />

        <div className="mb-12 mt-10 max-w-4xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">PRICING</p>
          <h1 className="mb-4 text-4xl font-black text-white">Simple pricing for serious launch planning</h1>
          <p className="text-lg leading-8 text-slate-400">Start free, then upgrade when you need saved projects, competitor pricing context, and a repeatable planning workflow.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={[
                "rounded-[2rem] border p-8 flex flex-col",
                plan.featured ? "border-blue-500/50 bg-blue-600/10 ring-2 ring-blue-500/30" : "border-slate-800 bg-slate-900/60",
              ].join(" ")}
            >
              <div>
                {plan.featured && (
                  <div className="mb-3 inline-flex rounded-full border border-blue-500/50 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-blue-300">
                    Best for active planning
                  </div>
                )}
                <p className={["text-[10px] font-black uppercase tracking-[0.3em]", plan.featured ? "text-blue-400" : "text-slate-500"].join(" ")}>{plan.name}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{plan.description}</p>
              </div>
              <div className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                <Link
                  href={plan.ctaHref}
                  className={[
                    "block rounded-2xl px-5 py-3 text-center text-sm font-semibold transition",
                    plan.featured
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-blue-300",
                  ].join(" ")}
                >
                  {plan.ctaLabel}
                </Link>
                {plan.ctaSupportingText ? (
                  <p className="text-xs leading-6 text-slate-400">{plan.ctaSupportingText}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-[2rem] border border-slate-800 bg-slate-900/60 p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">WHY UPGRADE</p>
          <h2 className="mt-3 text-3xl font-black text-white">Launch Planner is for developers who want to move beyond rough estimates and plan with more confidence.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Starter helps you get your first numbers. Launch Planner is for saving work, comparing scenarios more seriously, and making clearer decisions around budget, pricing, and launch risk.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {upgradeReasons.map((reason) => (
              <article key={reason.title} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-lg font-black text-white">{reason.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{reason.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-6 text-2xl font-black text-white">Common questions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-base font-black text-white">Why charge a subscription and also charge credits?</h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">Launch Planner gives you the core planning workflow, saved projects, and dashboard history. Credits are for optional tools with extra processing costs, such as competitor price analysis. Included monthly credits refresh each billing cycle and do not roll over.</p>
            </article>
            <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-base font-black text-white">What is included in Launch Planner?</h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">Launch Planner includes the core break-even workflow, saved project storage, dashboard access, and included monthly credits for optional credit-based tools.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

