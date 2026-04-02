"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const nextPath = useMemo(() => {
    const requested = searchParams.get("next");
    if (!requested || !requested.startsWith("/") || requested.startsWith("//")) {
      return "/dashboard";
    }
    return requested;
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace(nextPath);
      }
    };

    void checkSession();
  }, [router, nextPath]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const supabase = createClient();
    if (!supabase) {
      setErrorMessage(missingSupabaseClientEnvMessage);
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 h-[42vh] max-h-[400px] w-[92vw] max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 opacity-10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/landing" className="cursor-pointer text-2xl font-black italic tracking-tight text-blue-500 transition hover:text-blue-400 sm:text-3xl">
            Hollow Metric
          </Link>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 sm:text-sm">Launch Planning Suite</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <h1 className="mb-2 text-2xl font-black text-white">Log In</h1>
          <p className="mb-6 text-sm text-slate-400">Access your launch planning workspace.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-600/50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-600/50"
              />
            </label>

            {errorMessage && <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">{errorMessage}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Log In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            No account yet? {" "}
            <Link href="/signup" className="font-semibold text-blue-300 hover:text-blue-200">Create one</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
