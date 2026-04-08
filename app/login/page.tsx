"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { shouldBypassTurnstile } from "@/lib/turnstile-bypass";
import { createClient } from "@/utils/supabase/client";
import { missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

type FieldErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginForm(email: string, password: string): FieldErrors {
  const nextErrors: FieldErrors = {};

  if (!email) {
    nextErrors.email = "Enter your email address.";
  } else if (!emailPattern.test(email)) {
    nextErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    nextErrors.password = "Enter your password.";
  }

  return nextErrors;
}

function getFriendlyLoginError(message: string): string | null {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid credentials")
  ) {
    return "Email or password is incorrect.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Please confirm your email address before logging in.";
  }

  if (normalizedMessage.includes("too many requests")) {
    return "Too many login attempts. Please wait a moment and try again.";
  }

  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return "We couldn't log you in right now. Please check your connection and try again.";
  }

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

    if (isSubmitting) {
      return;
    }

    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    const nextFieldErrors = validateLoginForm(trimmedEmail, password);
    setFieldErrors(nextFieldErrors);

    if (nextFieldErrors.email || nextFieldErrors.password) {
      return;
    }

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

    try {
      const signInPayload = isTurnstileEnabled
        ? {
            email: trimmedEmail,
            password,
            options: {
              captchaToken: turnstileToken ?? undefined,
            },
          }
        : {
            email: trimmedEmail,
            password,
          };

      const { error: signInError } = await supabase.auth.signInWithPassword(signInPayload);

      if (signInError) {
        const errorMessage = signInError.message?.toLowerCase() ?? "";
        const isCaptchaPolicyError = errorMessage.includes("captcha");

        if (isLocalCaptchaBypass && isCaptchaPolicyError) {
          setError(
            "Local login is blocked by Supabase project captcha policy. For localhost development, disable Auth captcha in Supabase Authentication settings (or use a separate dev Supabase project with captcha off)."
          );
          return;
        }

        setError(
          getFriendlyLoginError(signInError.message ?? "") ??
            "We couldn't log you in right now. Please check your connection and try again."
        );
        return;
      }

      setInfo("Signed in successfully. Redirecting...");
      router.push(nextPath);
    } catch {
      setError("We couldn't log you in right now. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
      setTurnstileToken(null);
      setTurnstileResetNonce((value) => value + 1);
    }
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

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
                setInfo(null);

                if (fieldErrors.email) {
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }
              }}
              required
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p id="login-email-error" className="mt-2 text-sm text-rose-300" role="alert">
                {fieldErrors.email}
              </p>
            )}
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
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
                setInfo(null);

                if (fieldErrors.password) {
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }
              }}
              required
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="Enter your password"
            />
            {fieldErrors.password && (
              <p id="login-password-error" className="mt-2 text-sm text-rose-300" role="alert">
                {fieldErrors.password}
              </p>
            )}
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-sm font-semibold text-blue-300 transition hover:text-blue-200">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-emerald-300" role="status">
              {info}
            </p>
          )}

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
