"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PublicSiteHeader from "@/components/public-site-header";
import { openPaddleCheckout } from "@/lib/paddle";

type LaunchMathAuditFormState = {
  name: string;
  email: string;
  gameName: string;
  steamUrl: string;
  releaseWindow: string;
  plannedPrice: string;
  estimatedBudget: string;
  biggestConcern: string;
  referralCode: string;
};

type LaunchMathAuditFieldErrors = Partial<Record<keyof LaunchMathAuditFormState, string>>;

type LaunchMathAuditCheckoutResponse = {
  priceId?: string;
  email?: string;
  successUrl?: string;
  customData?: Record<string, string>;
  error?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM_STATE: LaunchMathAuditFormState = {
  name: "",
  email: "",
  gameName: "",
  steamUrl: "",
  releaseWindow: "",
  plannedPrice: "",
  estimatedBudget: "",
  biggestConcern: "",
  referralCode: "",
};

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We couldn't start checkout right now. Please try again.";
}

function validateLaunchMathAuditForm(formState: LaunchMathAuditFormState) {
  const errors: LaunchMathAuditFieldErrors = {};

  if (!formState.name.trim()) {
    errors.name = "Enter your name.";
  }

  const email = formState.email.trim();
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!formState.gameName.trim()) {
    errors.gameName = "Enter your game name.";
  }

  if (!formState.steamUrl.trim()) {
    errors.steamUrl = "Enter your Steam URL.";
  }

  if (!formState.estimatedBudget.trim()) {
    errors.estimatedBudget = "Enter your estimated budget.";
  }

  if (!formState.biggestConcern.trim()) {
    errors.biggestConcern = "Tell me the biggest concern you want checked.";
  }

  return errors;
}

function LaunchMathAuditPageContent() {
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState<LaunchMathAuditFormState>(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState<LaunchMathAuditFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const showConfirmation = useMemo(
    () => searchParams.get("checkout") === "success",
    [searchParams],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateLaunchMathAuditForm(formState);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/launch-math-audit/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const result = (await response.json().catch(() => null)) as LaunchMathAuditCheckoutResponse | null;

      if (!response.ok || !result?.priceId) {
        throw new Error(
          result?.error?.trim() ||
            "We couldn't start checkout right now. Please email support@hollowmetric.com.",
        );
      }

      await openPaddleCheckout(result.priceId, {
        email: result.email,
        successUrl: result.successUrl,
        customData: result.customData,
      });
    } catch (error) {
      setSubmitError(normalizeErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <PublicSiteHeader />

        <section className="mt-10 rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">One-Time Paid Service</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">Indie Game Launch Math Audit</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Need someone to do the launch math for you? I will check your pricing, competitors, break-even risk, scope risk, and budget assumptions, then email you a written report within 48 hours after payment.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                const form = document.getElementById("launch-math-audit-form");
                form?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              Get Audit
            </button>
            <p className="text-sm font-semibold text-slate-200">$99 first-audit price</p>
          </div>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            Written report emailed within 48 hours after payment.
          </p>
        </section>

        {showConfirmation ? (
          <section className="mt-6 rounded-[2rem] border border-emerald-500/40 bg-emerald-600/10 p-6">
            <p className="text-sm font-semibold text-emerald-200">
              Your Launch Math Audit request was received. Once payment is confirmed, your written report will be emailed within 48 hours.
            </p>
            <p className="mt-2 text-sm text-emerald-100/90">
              If you made a typo or need to add context, email support@hollowmetric.com.
            </p>
          </section>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-2xl font-black text-white">What this audit checks</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Planned price</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Comparable games and pricing context</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Break-even risk</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Scope risk</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Estimated budget realism</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />Commercial risk based on the information provided</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />The biggest concern you want checked</li>
            </ul>
            <p className="mt-4 text-xs leading-6 text-slate-400">
              Scope risk means checking whether the game appears to promise more work than the likely budget, team size, timeline, and sales target can support.
            </p>
            <p className="mt-3 text-xs leading-6 text-slate-400">
              Example of wording used in the report: These visible parts of the project may carry risk if your budget, timeline, or sales targets are tight.
            </p>
          </article>

          <article className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-2xl font-black text-white">What this is not</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />This is not a Steam page review</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />This is not a game review</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />This is not marketing feedback</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />This is not wishlist or conversion feedback</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />This is not a guaranteed sales plan</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />This is not legal, tax, financial, or investment advice</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />This does not guarantee sales, wishlists, traffic, publisher interest, or revenue</li>
              <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />This does not include a call</li>
            </ul>
            <p className="mt-4 text-xs leading-6 text-slate-400">
              The Steam URL is collected only so I can understand the game and compare it against relevant games.
            </p>
          </article>
        </section>

        <section id="launch-math-audit-form" className="mt-8 rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white">Get Audit</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Fill out the request form, then complete one-time payment. No login or dashboard is required.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="launch-audit-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Name</label>
              <input
                id="launch-audit-name"
                name="name"
                value={formState.name}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, name: event.target.value }));
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "launch-audit-name-error" : undefined}
              />
              {fieldErrors.name ? <p id="launch-audit-name-error" className="mt-2 text-sm text-rose-300" role="alert">{fieldErrors.name}</p> : null}
            </div>

            <div>
              <label htmlFor="launch-audit-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Email</label>
              <input
                id="launch-audit-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formState.email}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, email: event.target.value }));
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "launch-audit-email-error" : "launch-audit-email-helper"}
              />
              <p id="launch-audit-email-helper" className="mt-2 text-xs text-slate-400">Your report will be emailed to you within 48 hours after payment.</p>
              {fieldErrors.email ? <p id="launch-audit-email-error" className="mt-2 text-sm text-rose-300" role="alert">{fieldErrors.email}</p> : null}
            </div>

            <div>
              <label htmlFor="launch-audit-game-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Game Name</label>
              <input
                id="launch-audit-game-name"
                name="gameName"
                value={formState.gameName}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, gameName: event.target.value }));
                  if (fieldErrors.gameName) {
                    setFieldErrors((prev) => ({ ...prev, gameName: undefined }));
                  }
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                aria-invalid={Boolean(fieldErrors.gameName)}
                aria-describedby={fieldErrors.gameName ? "launch-audit-game-name-error" : undefined}
              />
              {fieldErrors.gameName ? <p id="launch-audit-game-name-error" className="mt-2 text-sm text-rose-300" role="alert">{fieldErrors.gameName}</p> : null}
            </div>

            <div>
              <label htmlFor="launch-audit-steam-url" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Steam URL</label>
              <input
                id="launch-audit-steam-url"
                name="steamUrl"
                value={formState.steamUrl}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, steamUrl: event.target.value }));
                  if (fieldErrors.steamUrl) {
                    setFieldErrors((prev) => ({ ...prev, steamUrl: undefined }));
                  }
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                aria-invalid={Boolean(fieldErrors.steamUrl)}
                aria-describedby={fieldErrors.steamUrl ? "launch-audit-steam-url-error" : undefined}
              />
              {fieldErrors.steamUrl ? <p id="launch-audit-steam-url-error" className="mt-2 text-sm text-rose-300" role="alert">{fieldErrors.steamUrl}</p> : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="launch-audit-release-window" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Release Window (Optional if any)</label>
                <input
                  id="launch-audit-release-window"
                  name="releaseWindow"
                  value={formState.releaseWindow}
                  onChange={(event) => setFormState((prev) => ({ ...prev, releaseWindow: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="launch-audit-planned-price" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Planned Price (Optional if any)</label>
                <input
                  id="launch-audit-planned-price"
                  name="plannedPrice"
                  value={formState.plannedPrice}
                  onChange={(event) => setFormState((prev) => ({ ...prev, plannedPrice: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="launch-audit-estimated-budget" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Estimated Budget</label>
              <input
                id="launch-audit-estimated-budget"
                name="estimatedBudget"
                value={formState.estimatedBudget}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, estimatedBudget: event.target.value }));
                  if (fieldErrors.estimatedBudget) {
                    setFieldErrors((prev) => ({ ...prev, estimatedBudget: undefined }));
                  }
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                aria-invalid={Boolean(fieldErrors.estimatedBudget)}
                aria-describedby={fieldErrors.estimatedBudget ? "launch-audit-estimated-budget-error" : "launch-audit-estimated-budget-helper"}
              />
              <p id="launch-audit-estimated-budget-helper" className="mt-2 text-xs text-slate-400">I can&apos;t give useful feedback if you leave this as $0.</p>
              {fieldErrors.estimatedBudget ? <p id="launch-audit-estimated-budget-error" className="mt-2 text-sm text-rose-300" role="alert">{fieldErrors.estimatedBudget}</p> : null}
            </div>

            <div>
              <label htmlFor="launch-audit-biggest-concern" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Biggest Concern</label>
              <textarea
                id="launch-audit-biggest-concern"
                name="biggestConcern"
                rows={5}
                value={formState.biggestConcern}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, biggestConcern: event.target.value }));
                  if (fieldErrors.biggestConcern) {
                    setFieldErrors((prev) => ({ ...prev, biggestConcern: undefined }));
                  }
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                aria-invalid={Boolean(fieldErrors.biggestConcern)}
                aria-describedby={fieldErrors.biggestConcern ? "launch-audit-biggest-concern-error" : undefined}
              />
              {fieldErrors.biggestConcern ? <p id="launch-audit-biggest-concern-error" className="mt-2 text-sm text-rose-300" role="alert">{fieldErrors.biggestConcern}</p> : null}
            </div>

            <div>
              <label htmlFor="launch-audit-referral-code" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Referral Code (Optional if any)</label>
              <input
                id="launch-audit-referral-code"
                name="referralCode"
                value={formState.referralCode}
                onChange={(event) => setFormState((prev) => ({ ...prev, referralCode: event.target.value }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {submitError ? <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{submitError}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Opening Checkout..." : "Get Audit"}
              </button>
              <p className="text-xs text-slate-400">One-time payment handled through Paddle.</p>
            </div>
          </form>
        </section>

        <p className="mt-8 pb-8 text-center text-xs text-slate-500">
          Questions before buying? <Link href="/contact" className="text-blue-300 transition hover:text-blue-200">Contact Hollow Metric support</Link>.
        </p>
      </div>
    </main>
  );
}

export default function LaunchMathAuditPage() {
  return (
    <Suspense fallback={null}>
      <LaunchMathAuditPageContent />
    </Suspense>
  );
}
