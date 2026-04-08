"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { shouldBypassTurnstile } from "@/lib/turnstile-bypass";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

type FieldErrors = {
  email?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const createRecoveryClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

function validateForgotPasswordForm(email: string): FieldErrors {
  if (!email) {
    return { email: "Enter your email address." };
  }

  if (!emailPattern.test(email)) {
    return { email: "Enter a valid email address." };
  }

  return {};
}

function getFriendlyResetError(message: string): string | null {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("email") && normalizedMessage.includes("invalid")) {
    return "Enter a valid email address.";
  }

  if (normalizedMessage.includes("too many requests")) {
    return "Too many reset requests. Please wait a moment and try again.";
  }

  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return "We couldn't send the reset email right now. Please check your connection and try again.";
  }

  return null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    const nextFieldErrors = validateForgotPasswordForm(trimmedEmail);
    setFieldErrors(nextFieldErrors);

    if (nextFieldErrors.email) {
      return;
    }

    const supabase = createRecoveryClient() ?? createClient();
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
      const redirectTo = new URL("/reset-password", window.location.origin).toString();
      const resetOptions = isTurnstileEnabled
        ? {
            redirectTo,
            captchaToken: turnstileToken ?? undefined,
          }
        : {
            redirectTo,
          };

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        ...resetOptions,
      });

      if (resetError) {
        const errorMessage = resetError.message?.toLowerCase() ?? "";
        const isCaptchaPolicyError = errorMessage.includes("captcha");

        if (isLocalCaptchaBypass && isCaptchaPolicyError) {
          setError(
            "Local password reset is blocked by Supabase project captcha policy. For localhost development, disable Auth captcha in Supabase Authentication settings (or use a separate dev Supabase project with captcha off)."
          );
          return;
        }

        setError(
          getFriendlyResetError(resetError.message ?? "") ??
            "We couldn't send the reset email right now. Please try again in a moment."
        );
        return;
      }

      setInfo("If an account exists for this email, we sent a password reset link.");
    } catch {
      setError("We couldn't send the reset email right now. Please check your connection and try again.");
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
          <Link href="/login" className="text-sm font-semibold text-blue-300 transition hover:text-blue-200">
            Back to login
          </Link>
        </div>

        <h1 className="text-3xl font-black text-white">Reset password</h1>
        <p className="mt-2 text-sm text-slate-400">Enter your email and we will send you a reset link.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
          <div>
            <label htmlFor="forgot-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Email
            </label>
            <input
              id="forgot-email"
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
              aria-describedby={fieldErrors.email ? "forgot-email-error" : undefined}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p id="forgot-email-error" className="mt-2 text-sm text-rose-300" role="alert">
                {fieldErrors.email}
              </p>
            )}
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
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
          </button>

          <TurnstileWidget
            action="forgot_password_form"
            onTokenChange={setTurnstileToken}
            resetNonce={turnstileResetNonce}
          />
        </form>
      </div>
    </main>
  );
}
