"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

type ReportRow = {
  id: string;
  game_name: string;
  project_name: string | null;
  vaporscore: number;
  created_at: string;
};

type LegacyReportRow = Omit<ReportRow, "project_name">;

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
  const [activeProject, setActiveProject] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError || !user) {
        setError(authError?.message ?? "Unauthorized");
        setAudits([]);
        setIsLoading(false);
        return;
      }

      const userId = user.id;

      const { data, error: queryError } = await supabase
        .from("reports")
        .select("id, game_name, project_name, vaporscore, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        // Gracefully fall back — try without project_name in case the column doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("reports")
          .select("id, game_name, vaporscore, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!mounted) return;

        if (fallbackError) {
          setError(fallbackError.message);
          setAudits([]);
        } else {
          const rows = (fallbackData ?? []).map((report: LegacyReportRow) => ({
            ...report,
            project_name: null,
          }));
          setAudits(rows);
          setActiveProject("Uncategorized");
        }
      } else {
        const rows = (data ?? []) as ReportRow[];
        setAudits(rows);

        const names = [...new Set(rows.map((r) => r.project_name || "Uncategorized"))];
        const saved = localStorage.getItem("hm_active_project");
        if (saved && names.includes(saved)) {
          setActiveProject(saved);
        } else if (names.length > 0) {
          setActiveProject(names[0]);
        }
      }

      setIsLoading(false);
    };

    loadReports();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const projectNames = useMemo(
    () => [...new Set(audits.map((a) => a.project_name || "Uncategorized"))],
    [audits]
  );

  const filteredAudits = useMemo(
    () => (!activeProject ? audits : audits.filter((a) => (a.project_name || "Uncategorized") === activeProject)),
    [audits, activeProject]
  );

  const handleProjectSwitch = (name: string) => {
    setActiveProject(name);
    setDropdownOpen(false);
    localStorage.setItem("hm_active_project", name);
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Delete all audits for this project? This cannot be undone.")) return;
    setClearing(true);

    try {
      const res = await fetch("/api/delete-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: activeProject }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete reports");
      }

      // Update local state
      const remaining = audits.filter((a) => (a.project_name || "Uncategorized") !== activeProject);
      setAudits(remaining);
      const names = [...new Set(remaining.map((r) => r.project_name || "Uncategorized"))];
      setActiveProject(names[0] ?? "");
    } catch (err) {
      console.error("Failed to clear history:", err);
      const message = err instanceof Error ? err.message : "Failed to delete audits. Please try again.";
      alert(message);
    } finally {
      setClearing(false);
    }
  };

  const PageHeader = () => (
    <div className="mb-10 border-b border-slate-900 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {projectNames.length > 0 && activeProject ? (
          <div ref={dropdownRef} className="relative inline-block w-full sm:w-auto">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex w-full items-start justify-between gap-2 text-left sm:w-auto sm:items-center"
            >
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Project: {activeProject}
              </h1>
              <ChevronDown
                size={22}
                className={`text-blue-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:min-w-[240px]">
                {projectNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleProjectSwitch(name)}
                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all ${
                      name === activeProject
                        ? "text-blue-400 bg-blue-500/10"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">My Library</h1>
        )}

        {audits.length > 0 && (
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            className="mt-1 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-400 transition-all hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            <Trash2 size={13} />
            {clearing ? "Clearing..." : "Clear History"}
          </button>
        )}
      </div>
      <p className="text-slate-500 mt-2">Audit history and performance snapshots for your active project.</p>
    </div>
  );

  if (isLoading) {
    return (
      <section>
        <div className="mb-10 border-b border-slate-900 pb-6">
          <div className="h-9 w-64 rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-4 w-80 rounded-lg bg-slate-800 animate-pulse mt-3" />
        </div>
        <p className="text-slate-400">Loading your saved audits...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <PageHeader />
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p className="text-slate-200 font-semibold mb-2">Nothing here yet</p>
          <p className="text-slate-500 text-sm">Run your first audit to fill this space.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <PageHeader />

      {audits.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p className="text-slate-200 font-semibold mb-2">Nothing here yet</p>
          <p className="text-slate-500 text-sm">Run your first audit to fill this space.</p>
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
          <p className="text-slate-200 font-semibold mb-2">No audits for this project yet</p>
          <p className="text-slate-400">
            Run a new audit and assign it to &quot;{activeProject}&quot; to see results here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAudits.map((audit) => (
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
      )}
    </section>
  );
}
