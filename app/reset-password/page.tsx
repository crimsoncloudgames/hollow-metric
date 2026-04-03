"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(true);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeRecovery = async () => {
      setError(null);
      setInfo(null);

      const supabase = createRecoveryClient() ?? createClient();
      if (!supabase) {
        if (mounted) {
          setError(missingSupabaseClientEnvMessage);
          setIsCheckingRecovery(false);
        }
        return;
      }

      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const recoveryType = searchParams.get("type") ?? hashParams.get("type");
      const exchangeCode = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const accessToken = hashParams.get("access_token") ?? searchParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") ?? searchParams.get("refresh_token");
      const incomingError =
        searchParams.get("error_description") ??
        searchParams.get("error") ??
        hashParams.get("error_description") ??
        hashParams.get("error");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (session?.user) {
        setIsRecoveryReady(true);
        setIsCheckingRecovery(false);
        return;
      }

      if (incomingError) {
        setError(decodeURIComponent(incomingError));
        setIsCheckingRecovery(false);
        return;
      }

      let recoveryError: string | null = null;

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          recoveryError = sessionError.message;
        }
      } else if (tokenHash && recoveryType === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (verifyError) {
          recoveryError = verifyError.message;
        }
      } else if (exchangeCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(exchangeCode);
        if (exchangeError) {
          const fallbackToOtp = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: exchangeCode,
          });

          if (fallbackToOtp.error) {
            const isPkceVerifierIssue = exchangeError.message.toLowerCase().includes("code verifier");
            if (isPkceVerifierIssue) {
              recoveryError = "This reset link used an outdated verification method. Please request a new reset link and try again.";
            } else {
              recoveryError = exchangeError.message;
            }
          }
        }
      } else {
        recoveryError = "This password reset link is invalid or has expired. Please request a new one.";
      }

      const {
        data: { session: resolvedSession },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (recoveryError || !resolvedSession?.user) {
        setError(recoveryError ?? "This password reset link is invalid or has expired. Please request a new one.");
        setIsCheckingRecovery(false);
        return;
      }

      window.history.replaceState({}, document.title, url.pathname);
      setIsRecoveryReady(true);
      setIsCheckingRecovery(false);
    };

    void initializeRecovery();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = createRecoveryClient() ?? createClient();
    if (!supabase) {
      setError(missingSupabaseClientEnvMessage);
      return;
    }

    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setInfo("Password updated successfully. Redirecting to login...");
    window.setTimeout(() => {
      router.push("/login");
    }, 900);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/landing" className="text-sm font-semibold text-slate-300 transition hover:text-blue-400">
            Back to home
          </Link>
          <Link href="/forgot-password" className="text-sm font-semibold text-blue-300 transition hover:text-blue-200">
            Request new link
          </Link>
        </div>

        <h1 className="text-3xl font-black text-white">Create a new password</h1>
        <p className="mt-2 text-sm text-slate-400">Enter your new password to recover access to your account.</p>

        {isCheckingRecovery ? (
          <p className="mt-8 text-sm text-slate-300">Checking your reset link...</p>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="reset-password" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                disabled={!isRecoveryReady || isSubmitting}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 disabled:opacity-60"
                placeholder="Enter a new password"
              />
            </div>

            <div>
              <label htmlFor="reset-password-confirm" className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Confirm new password
              </label>
              <input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                disabled={!isRecoveryReady || isSubmitting}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-blue-600/50 focus:outline-none focus:ring-1 focus:ring-blue-600/30 disabled:opacity-60"
                placeholder="Re-enter your new password"
              />
            </div>

            {error && <p className="text-sm text-rose-300">{error}</p>}
            {info && <p className="text-sm text-emerald-300">{info}</p>}

            <button
              type="submit"
              disabled={!isRecoveryReady || isSubmitting}
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isSubmitting ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
