"use client";
import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

const getSafeRedirectPath = (candidate: string | null) => {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }

  return candidate;
};

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const redirectPath = getSafeRedirectPath(searchParams.get("next"));
  const signUpHref = `/signup?next=${encodeURIComponent(redirectPath)}`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError(missingSupabaseClientEnvMessage);
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirectPath);
    router.refresh();
    setLoading(false);
  };

  const handleGithubSignIn = async () => {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError(missingSupabaseClientEnvMessage);
      setLoading(false);
      return;
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600 opacity-10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/landing">
            <span className="text-blue-500 font-black italic text-3xl tracking-tight cursor-pointer">Hollow Metric</span>
          </Link>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Market Intelligence Engine</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-black text-white mb-1">Welcome back</h1>
          <p className="text-slate-400 text-sm mb-6">Sign in to access your audit library.</p>

          {/* GitHub */}
          <button
            type="button"
            onClick={handleGithubSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl border border-slate-700 transition mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.804 5.625-5.475 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-sm"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                <a href="#" className="text-xs text-blue-400 hover:underline">Forgot password?</a>
              </div>
              <input
                type="password"
                required
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-sm"
              />
            </div>
            {error && (
              <p className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl transition mt-2 tracking-wide flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Signing In...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-slate-500 text-sm text-center mt-6">
            New here?{" "}
            <Link href={signUpHref} className="text-blue-400 hover:underline font-semibold">Create an account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
