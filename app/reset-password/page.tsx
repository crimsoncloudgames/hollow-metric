"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

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

      const supabase = createClient();
      if (!supabase) {
        if (mounted) {
          setError(missingSupabaseClientEnvMessage);
          setIsCheckingRecovery(false);
        }
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      const hasRecoveryParams =
        hashParams.get("type") === "recovery" ||
        Boolean(hashParams.get("access_token")) ||
        Boolean(hashParams.get("refresh_token"));

      if (hashError && mounted) {
        setError(decodeURIComponent(hashError));
      }

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

      if (!hasRecoveryParams) {
        setError("This password reset link is invalid or has expired. Please request a new one.");
        setIsCheckingRecovery(false);
        return;
      }

      const timeoutId = window.setTimeout(async () => {
        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (delayedSession?.user) {
          setIsRecoveryReady(true);
          setIsCheckingRecovery(false);
          return;
        }

        setError("This password reset link is invalid or has expired. Please request a new one.");
        setIsCheckingRecovery(false);
      }, 800);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, currentSession) => {
        if (!mounted) {
          return;
        }

        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && currentSession?.user)) {
          window.clearTimeout(timeoutId);
          setIsRecoveryReady(true);
          setIsCheckingRecovery(false);
          setError(null);
        }
      });

      return () => {
        window.clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    };

    let cleanup: (() => void) | undefined;
    void initializeRecovery().then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      mounted = false;
      cleanup?.();
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

    const supabase = createClient();
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
