"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { shouldBypassTurnstile } from "@/lib/turnstile-bypass";
import { createClient } from "@/utils/supabase/client";
import { missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignUpForm(fullName: string, email: string, password: string): FieldErrors {
  const nextErrors: FieldErrors = {};

  if (!fullName) {
    nextErrors.fullName = "Enter your name.";
  }

  if (!email) {
    nextErrors.email = "Enter your email address.";
  } else if (!emailPattern.test(email)) {
    nextErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    nextErrors.password = "Enter a password.";
  } else if (password.length < 6) {
    nextErrors.password = "Password must be at least 6 characters.";
  }

  return nextErrors;
}

function getFriendlySignUpError(message: string): string | null {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already been registered") ||
    normalizedMessage.includes("user already registered")
  ) {
    return "An account with that email already exists. Try logging in instead.";
  }

  if (normalizedMessage.includes("email address") && normalizedMessage.includes("invalid")) {
    return "Enter a valid email address.";
  }

  if (normalizedMessage.includes("password") && normalizedMessage.includes("6")) {
    return "Password must be at least 6 characters.";
  }

  if (normalizedMessage.includes("too many requests")) {
    return "Too many signup attempts. Please wait a moment and try again.";
  }

  if (normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return "We couldn't create your account right now. Please check your connection and try again.";
  }

  return null;
}

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setInfo(null);

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const nextFieldErrors = validateSignUpForm(trimmedFullName, trimmedEmail, password);
    setFieldErrors(nextFieldErrors);

    if (nextFieldErrors.fullName || nextFieldErrors.email || nextFieldErrors.password) {
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
      const signUpOptions = isTurnstileEnabled
        ? {
            data: {
              full_name: trimmedFullName,
              username: username.trim() || null,
            },
            captchaToken: turnstileToken ?? undefined,
          }
        : {
            data: {
              full_name: trimmedFullName,
              username: username.trim() || null,
            },
          };

      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: signUpOptions,
      });

      if (signUpError) {
        const errorMessage = signUpError.message?.toLowerCase() ?? "";
        const isCaptchaPolicyError = errorMessage.includes("captcha");

        if (isLocalCaptchaBypass && isCaptchaPolicyError) {
          setError(
            "Local signup is blocked by Supabase project captcha policy. For localhost development, disable Auth captcha in Supabase Authentication settings (or use a separate dev Supabase project with captcha off)."
          );
          return;
        }

        setError(
          getFriendlySignUpError(signUpError.message ?? "") ??
            "We couldn't create your account right now. Please try again in a moment."
        );
        return;
      }

      setInfo("Account created. Check your email for confirmation if prompted.");
      router.push("/login");
    } catch {
      setError("We couldn't create your account right now. Please check your connection and try again.");
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
            Already have an account?
          </Link>
        </div>

        <h1 className="text-3xl font-black text-white">Sign up</h1>
        <p className="mt-2 text-sm text-slate-400">Create your Hollow Metric account.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
          <div>
            <label htmlFor="signup-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                setError(null);
                setInfo(null);

                if (fieldErrors.fullName) {
                  setFieldErrors((current) => ({ ...current, fullName: undefined }));
                }
              }}
              required
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? "signup-name-error" : undefined}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="Your name"
            />
            {fieldErrors.fullName && (
              <p id="signup-name-error" className="mt-2 text-sm text-rose-300" role="alert">
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="signup-username" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Username
            </label>
            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="Choose a username (optional)"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Email
            </label>
            <input
              id="signup-email"
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
              aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p id="signup-email-error" className="mt-2 text-sm text-rose-300" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="signup-password" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
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
              minLength={6}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "signup-password-error" : undefined}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30"
              placeholder="Create a password"
            />
            {fieldErrors.password && (
              <p id="signup-password-error" className="mt-2 text-sm text-rose-300" role="alert">
                {fieldErrors.password}
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          <TurnstileWidget
            action="signup_form"
            onTokenChange={setTurnstileToken}
            resetNonce={turnstileResetNonce}
          />
        </form>
      </div>
    </main>
  );
}
