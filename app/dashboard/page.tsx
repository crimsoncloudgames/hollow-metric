"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

type ReportRow = {
  id: string;
  game_name: string;
  vaporscore: number;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardLibraryPage() {
  const [audits, setAudits] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      if (!supabase) {
        if (!mounted) return;
        setError(missingSupabaseClientEnvMessage);
        setAudits([]);
        setIsLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("reports")
        .select("id, game_name, vaporscore, created_at")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setAudits([]);
      } else {
        setAudits((data ?? []) as ReportRow[]);
      }

      setIsLoading(false);
    };

    loadReports();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
        <p className="text-slate-400">Loading your saved audits...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
        <p className="text-red-300 font-semibold mb-1">Could not load My Library</p>
        <p className="text-red-200/80 text-sm">{error}</p>
      </section>
    );
  }

  if (audits.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
        <p className="text-slate-200 font-semibold mb-2">No audits yet</p>
        <p className="text-slate-400">Run your first audit from "Run New Audit" and it will appear here.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {audits.map((audit) => (
          <article
            key={audit.id}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 hover:border-blue-600/40 transition-all"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-3">Audit Snapshot</p>
            <h2 className="text-xl font-black text-white mb-4 leading-tight">{audit.game_name}</h2>

            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">VaporScore</p>
              <p className="text-5xl font-black text-blue-500 leading-none mt-1">{audit.vaporscore}</p>
            </div>

            <p className="text-sm text-slate-400 mb-5">Date Audited: {formatDate(audit.created_at)}</p>

            <Link
              href={`/dashboard/reports/${audit.id}`}
              className="block w-full text-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-blue-600 hover:text-blue-400 transition-all"
            >
              View Full Report
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
