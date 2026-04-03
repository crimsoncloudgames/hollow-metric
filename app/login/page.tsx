"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { shouldBypassTurnstile } from "@/lib/turnstile-bypass";
import { createClient } from "@/utils/supabase/client";
import { missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);
  const isTurnstileEnabled =
    Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) &&
    !shouldBypassTurnstile({
      nodeEnv: process.env.NODE_ENV,
      hostname: typeof window === "undefined" ? null : window.location.hostname,
    });
  const isLocalCaptchaBypass = !isTurnstileEnabled;

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    const candidate = new URLSearchParams(window.location.search).get("next");
    if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
      return "/dashboard";
    }

    if (!candidate.startsWith("/dashboard")) {
      return "/dashboard";
    }

    return candidate;
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const supabase = createClient();
    if (!supabase) {
      setError(missingSupabaseClientEnvMessage);
      return;
    }

    if (isTurnstileEnabled && !turnstileToken) {
      setError("Please complete the captcha challenge.");
      return;
    }

    setIsSubmitting(true);
    const signInPayload = isTurnstileEnabled
      ? {
          email: email.trim(),
          password,
          options: {
            captchaToken: turnstileToken ?? undefined,
          },
        }
      : {
          email: email.trim(),
          password,
        };

    const { error: signInError } = await supabase.auth.signInWithPassword(signInPayload);
    setIsSubmitting(false);
    setTurnstileToken(null);
    setTurnstileResetNonce((value) => value + 1);

    if (signInError) {
      const errorMessage = signInError.message?.toLowerCase() ?? "";
      const isCaptchaPolicyError = errorMessage.includes("captcha");

      if (isLocalCaptchaBypass && isCaptchaPolicyError) {
        setError(
          "Local login is blocked by Supabase project captcha policy. For localhost development, disable Auth captcha in Supabase Authentication settings (or use a separate dev Supabase project with captcha off)."
        );
        return;
      }

      setError(signInError.message);
      return;
    }

    setInfo("Signed in successfully. Redirecting...");
    router.push(nextPath);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/landing" className="text-sm font-semibold text-slate-300 transition hover:text-blue-400">
            Back to home
          </Link>
          <Link href="/signup" className="text-sm font-semibold text-blue-300 transition hover:text-blue-200">
            Need an account?
          </Link>
        </div>

        <h1 className="text-3xl font-black text-white">Log in</h1>
        <p className="mt-2 text-sm text-slate-400">Access your Hollow Metric dashboard.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="Enter your password"
            />
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-sm font-semibold text-blue-300 transition hover:text-blue-200">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}
          {info && <p className="text-sm text-emerald-300">{info}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>

          <TurnstileWidget
            action="login_form"
            onTokenChange={setTurnstileToken}
            resetNonce={turnstileResetNonce}
          />
        </form>
      </div>
    </main>
  );
}
