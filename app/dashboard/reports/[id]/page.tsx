"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

type ReportRow = {
  id: string;
  game_name: string;
  vaporscore: number;
  report_json: any;
  created_at: string;
};

function getStatusColor(status?: string) {
  if (status === "Pass") return "text-green-500 border-green-500/20 bg-green-500/5";
  if (status === "Warning") return "text-yellow-500 border-yellow-500/20 bg-yellow-500/5";
  return "text-red-500 border-red-500/20 bg-red-500/5";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = params?.id;

  const [report, setReport] = useState<ReportRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    let mounted = true;

    const loadReport = async () => {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      if (!supabase) {
        if (!mounted) return;
        setError(missingSupabaseClientEnvMessage);
        setReport(null);
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError || !user) {
        setError(authError?.message ?? "Unauthorized");
        setReport(null);
        setIsLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("reports")
        .select("id, game_name, vaporscore, report_json, created_at")
        .eq("id", reportId)
        .eq("user_id", user.id)
        .single();

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setReport(null);
      } else {
        setReport(data as ReportRow);
      }

      setIsLoading(false);
    };

    loadReport();

    return () => {
      mounted = false;
    };
  }, [reportId]);

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
        <p className="text-slate-400">Loading full report...</p>
      </section>
    );
  }

  if (error || !report) {
    return (
      <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
        <p className="text-red-300 font-semibold mb-2">Could not load report</p>
        <p className="text-red-200/80 text-sm mb-4">{error || "Report not found."}</p>
        <Link href="/dashboard" className="text-blue-400 hover:underline text-sm font-semibold">
          Back to My Library
        </Link>
      </section>
    );
  }

  const json = report.report_json || {};

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Audit Overview</p>
        <h2 className="text-2xl font-black text-white">{report.game_name}</h2>
        <p className="text-slate-400 text-sm mt-2">Date Audited: {formatDate(report.created_at)}</p>
        <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-blue-600/30 bg-blue-600/10 px-4 py-2">
          <span className="text-xs uppercase tracking-widest text-blue-300 font-bold">VaporScore</span>
          <span className="text-2xl font-black text-blue-500">{report.vaporscore}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`border p-6 rounded-3xl ${getStatusColor(json?.storeAudit?.shortDesc?.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">Short Description</h3>
            <span className="text-[10px] font-black uppercase tracking-widest">{json?.storeAudit?.shortDesc?.status || "N/A"}</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed italic">
            "{json?.storeAudit?.shortDesc?.feedback || "No short description audit available."}"
          </p>
        </div>

        <div className={`border p-6 rounded-3xl ${getStatusColor(json?.storeAudit?.aboutGame?.status)}`}>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">About This Game</h3>
            <span className="text-[10px] font-black uppercase tracking-widest">{json?.storeAudit?.aboutGame?.status || "N/A"}</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed italic">
            "{json?.storeAudit?.aboutGame?.feedback || "No long description audit available."}"
          </p>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Verified Competitors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(json?.competitors || []).map((comp: any, i: number) => (
            <div key={`${comp?.name || "comp"}-${i}`} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="aspect-video bg-slate-950 rounded-lg mb-3 overflow-hidden border border-slate-800">
                {comp?.appId ? (
                  <img
                    src={`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${comp.appId}/capsule_184x69.jpg`}
                    alt={comp?.name || "Competitor"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-[10px] italic text-slate-500">No AppID</div>
                )}
              </div>
              <p className="text-xs font-bold text-slate-100 truncate">{comp?.name || "Unknown"}</p>
              <p className="text-[9px] text-blue-500 font-black uppercase mt-1">{comp?.primaryTag || "Tag"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Strategic Gap Analysis</h3>
        <div className="prose prose-invert max-w-none text-slate-300">
          <ReactMarkdown>{json?.analysis || "No analysis available."}</ReactMarkdown>
        </div>
      </section>

      <div>
        <Link href="/dashboard" className="text-blue-400 hover:underline font-semibold">
          Back to My Library
        </Link>
      </div>
    </section>
  );
}
