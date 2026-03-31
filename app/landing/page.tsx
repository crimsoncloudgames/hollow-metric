"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getCookieValue, setCookieValue } from "@/lib/client-cookies";
import { hasFunctionalCookieConsent } from "@/lib/client-consent";
import { COOKIE_NAMES } from "@/lib/cookie-consent";

type TeaserAuditResult = {
  suggestedTags?: string[];
  competitors?: Array<{ name: string }>;
  blurLocked?: boolean;
  cachedPreview?: boolean;
  storeAudit?: {
    shortDesc?: {
      status?: string;
      feedback?: string;
    };
  };
};

type PreviewApiError = {
  error?: string;
  errorCode?: string;
};

const pricingPlans = [
  {
    name: "Free Preview",
    price: "$0",
    featured: false,
    items: ["1 surfaced problem", "1 tag direction hint", "Limited preview", "No credit card required"],
  },
  {
    name: "10 Credits",
    price: "$24",
    featured: true,
    items: ["Use credits anytime", "Full audit: 5 credits", "Tag generator: 2 credits", "Break-even analysis: 2 credits", "Launch pack: 7 credits"],
  },
  {
    name: "25 Credits",
    price: "$49",
    featured: false,
    items: ["Lower cost per use", "Ideal for multiple revisions", "Best for active launches"],
  },
];

const faqs = [
  {
    question: "What does this analyze?",
    answer: "Your Steam page, tags, and basic revenue estimates.",
  },
  {
    question: "Do I need an account?",
    answer: "No for the preview. Yes to unlock full results.",
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

function getBlurredPreviewSegments(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 8) {
    return {
      clear: text,
      softBlur: "",
      hardBlur: "",
    };
  }

  const clearEnd = Math.max(1, Math.floor(words.length * 0.64));
  const softBlurEnd = Math.max(clearEnd + 1, Math.floor(words.length * 0.85));

  return {
    clear: words.slice(0, clearEnd).join(" "),
    softBlur: words.slice(clearEnd, softBlurEnd).join(" "),
    hardBlur: words.slice(softBlurEnd).join(" "),
  };
}

const LANDING_UNLOCK_USERNAME = "JeanPierresewebsitetool";
const LANDING_UNLOCK_PASSWORD = "9406155081086";
const LANDING_ACCESS_TOKEN = "granted_v2";

export default function LandingPage() {
  const [gateUsername, setGateUsername] = useState("");
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [isLandingUnlocked, setIsLandingUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [submittedInput, setSubmittedInput] = useState("");
  const [preview, setPreview] = useState<TeaserAuditResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewErrorCode, setPreviewErrorCode] = useState<string | null>(null);
  const [isBlurLocked, setIsBlurLocked] = useState(true);

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

  useEffect(() => {
    const landingAccessCookie = getCookieValue(COOKIE_NAMES.landingAccess);
    if (landingAccessCookie === LANDING_ACCESS_TOKEN) {
      setIsLandingUnlocked(true);
    }

    const blurCookie = getCookieValue(COOKIE_NAMES.blurState);
    if (blurCookie === "unlocked") {
      setIsBlurLocked(false);
    }

    const prefsRaw = getCookieValue(COOKIE_NAMES.analysisPrefs);
    if (!prefsRaw) return;

    try {
      const prefs = JSON.parse(prefsRaw) as { lastInput?: string };
      if (prefs.lastInput && !input) {
        setInput(prefs.lastInput);
      }
    } catch {
      // Ignore malformed preference cookies.
    }
  }, []);

  const handleUnlockLanding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (gateUsername === LANDING_UNLOCK_USERNAME && gatePassword === LANDING_UNLOCK_PASSWORD) {
      setCookieValue(COOKIE_NAMES.landingAccess, LANDING_ACCESS_TOKEN, 60 * 60 * 24);
      setGateError(null);
      setIsLandingUnlocked(true);
      return;
    }

    setGateError("Incorrect username or password.");
  };

  const previewTag = preview?.suggestedTags?.[0] ?? "Discoverability";
  const previewFeedback =
    preview?.storeAudit?.shortDesc?.feedback ??
    "Lead with clearer gameplay language in your short description.";
  const previewStatus = preview?.storeAudit?.shortDesc?.status ?? "Warning";
  const previewFeedbackSegments = getBlurredPreviewSegments(previewFeedback);
  const signupPreviewHref = buildAuthHref("/signup", submittedInput || input.trim());
  const loginPreviewHref = buildAuthHref("/login", submittedInput || input.trim());
  const isFreePreviewLimitReached = previewErrorCode === "FREE_PREVIEW_LIMIT_REACHED";

  if (!isLandingUnlocked) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-black">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">This site is under construction.</h1>
          <p className="mt-3 text-sm text-slate-700">
            Temporary access is restricted. Enter the username and password to preview the landing page.
          </p>

          <form onSubmit={handleUnlockLanding} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Username</label>
              <input
                type="text"
                value={gateUsername}
                onChange={(e) => setGateUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                autoComplete="current-password"
              />
            </div>

            {gateError && <p className="text-sm text-red-600">{gateError}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              Unlock Landing Page
            </button>
          </form>
        </div>
      </main>
    );
  }

  const handlePreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    let apiErrorCode: string | null = null;

    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewErrorCode(null);
    setSubmittedInput(trimmedInput);

    if (hasFunctionalCookieConsent()) {
      setCookieValue(COOKIE_NAMES.analysisPrefs, JSON.stringify({ lastInput: trimmedInput }), 60 * 60 * 24 * 7);
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userGame: trimmedInput,
          isUrl: trimmedInput.includes("store.steampowered.com/app/"),
          appId: extractAppId(trimmedInput),
          preview: true,
        }),
      });

      if (!response.ok) {
        let apiMessage = "Could not generate a preview right now.";

        try {
          const errorJson = (await response.json()) as PreviewApiError;
          if (typeof errorJson.error === "string" && errorJson.error.trim()) {
            apiMessage = errorJson.error;
          }
          if (typeof errorJson.errorCode === "string" && errorJson.errorCode.trim()) {
            apiErrorCode = errorJson.errorCode;
          }
        } catch {
          // Ignore JSON parse errors and fall back to the generic message.
        }

        throw new Error(apiMessage);
      }

      const data = (await response.json()) as TeaserAuditResult;
      setPreview(data);
      setPreviewErrorCode(null);
      setIsBlurLocked(Boolean(data.blurLocked));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not generate a preview right now.";
      setPreviewError(message);
      setPreviewErrorCode(apiErrorCode);
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
          <Link href="/landing" className="relative inline-block w-[min(62vw,18rem)] sm:w-[min(44vw,19rem)] md:w-[18rem]">
            <Image
              src="/HM logo icon with text webP.webp"
              alt="Hollow Metric"
              width={300}
              height={70}
              className="h-auto w-full"
              priority
            />
            <p className="absolute bottom-[6%] left-[34%] text-[8px] font-medium leading-none text-slate-500 sm:text-[9px] md:text-[10px] whitespace-nowrap">
              A tool by Crimson Cloud Games
            </p>
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
        <section className="fade-in pt-14 pb-10 text-center">
          <h1 className="hero-glow mx-auto max-w-4xl text-4xl font-black italic leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Your Steam page is costing you wishlists.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Fix what players don&apos;t understand, improve your tags, and see how many copies you need to sell to break even before launch.
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
                {isLoadingPreview ? "Checking..." : "Analyze My Steam Page"}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Takes less than 30 seconds. No signup required for your first preview.
            </p>
            <p className="mt-1 text-center text-xs text-slate-500">
              Free preview is limited to one use per IP address and Steam App ID. Login/Sign Up and buy more credit for more analyses.
            </p>
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
                  {isFreePreviewLimitReached && (
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Link href={signupPreviewHref} className="rounded-2xl bg-blue-600 px-5 py-2.5 text-center text-sm font-bold text-white transition hover:bg-blue-500">
                        Sign Up To Continue
                      </Link>
                      <Link href="/pricing" className="rounded-2xl border border-slate-600 px-5 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:border-blue-500 hover:text-blue-300">
                        Buy Credits
                      </Link>
                    </div>
                  )}
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
                        review with copy breakdown, full tag coverage, and break-even numbers.
                      </p>
                      <p className="mt-2 max-w-2xl text-xs text-slate-500">
                        Free preview shows one top tag only. Full tag set unlocks after sign-in or credits.
                      </p>
                    </div>
                    <div className="w-full lg:w-auto lg:min-w-[240px] rounded-3xl border border-blue-600/30 bg-blue-600/10 px-5 py-4">
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
                      <p className="mt-4 text-base leading-7 text-slate-200">
                        {isBlurLocked ? (
                          <>
                            <span>{previewFeedbackSegments.clear}</span>
                            {previewFeedbackSegments.softBlur && (
                              <span className="blur-[1px]"> {previewFeedbackSegments.softBlur}</span>
                            )}
                            {previewFeedbackSegments.hardBlur && (
                              <span className="blur-[2.4px]"> {previewFeedbackSegments.hardBlur}</span>
                            )}
                          </>
                        ) : (
                          previewFeedback
                        )}
                      </p>
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
        <section className="fade-in py-10 border-t border-slate-800/60">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">
              If your page doesn&apos;t click, your game won&apos;t either.
            </h2>
            <p className="mt-4 text-lg font-semibold leading-7 text-blue-300">If players don&apos;t understand your page in seconds, they leave.</p>
            <ul className="mt-8 space-y-4">
              {[
                "Players don't understand your game in seconds",
                "Your tags don't match how your game comes across to players",
                "You're guessing your pricing and break-even",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-slate-300 text-lg leading-7">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* SECTION 3: WHAT YOU GET */}
        <section className="fade-in py-10 border-t border-slate-800/60">
          <h2 className="mb-6 text-3xl font-black text-white md:text-4xl">
            Three things that matter before launch
          </h2>
          <p className="mb-8 text-base font-semibold text-blue-300">Know how many copies you need to break even.</p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Fix your Steam page",
                body: "Find what is unclear and fix it fast.",
                accent: "border-slate-800",
              },
              {
                title: "Get better tags",
                body: "Get tags that match how your game comes across to players.",
                accent: "border-slate-800",
              },
              {
                title: "Know your numbers",
                body: "Estimate how many copies you need to sell to break even before launch.",
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
        <section id="product-preview" className="fade-in py-10 border-t border-slate-800/60">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white md:text-4xl">See what you&apos;ll get</h2>
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
                  Analyze My Steam Page
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: PRICING */}
        <section className="fade-in py-10 border-t border-slate-800/60">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white md:text-4xl">Start free. Pay only when you want the full breakdown.</h2>
            <p className="mt-3 max-w-2xl text-slate-400">Try the preview first. Unlock full launch feedback only when you need it.</p>
            <p className="mt-4 text-sm font-semibold text-blue-300">Most users spend ~7 credits for a full launch check.</p>
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
        <section className="fade-in py-10 border-t border-slate-800/60">
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
        <section className="fade-in py-10">
          <div className="rounded-[2rem] border border-blue-600/30 bg-[linear-gradient(135deg,rgba(30,64,175,0.22),rgba(15,23,42,0.92))] p-10 text-center shadow-2xl">
            <h2 className="mx-auto max-w-2xl text-3xl font-black text-white sm:text-4xl">
              Fix what&apos;s costing you wishlists before you launch.
            </h2>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="#top"
                className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                Analyze My Steam Page
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

        {/* PRE-FOOTER TAGLINE */}
        <p className="fade-in pb-6 pt-0 mt-0 text-center text-xs text-slate-500">A tool for indie developers by an indie developer.</p>

        {/* FOOTER */}
        <footer className="fade-in border-t border-slate-800 py-10 text-sm text-slate-400">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <div className="relative inline-block w-[min(72vw,20rem)] sm:w-[min(52vw,19rem)] md:w-[18.75rem]">
                <Image src="/HM logo icon with text webP.webp" alt="Hollow Metric" width={300} height={70} className="h-auto w-full" />
                <p className="absolute bottom-[6%] left-[34%] text-[9px] font-medium leading-none text-slate-500 sm:text-[10px] whitespace-nowrap">
                  A tool by Crimson Cloud Games
                </p>
              </div>
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
