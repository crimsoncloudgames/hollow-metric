"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";

const loadingPhases = [
  "Fetching Steam Data...",
  "Analyzing Competitors...",
  "Calculating Score...",
];

function getVaporScore(result: any): number {
  const shortStatus = result?.storeAudit?.shortDesc?.status;
  const aboutStatus = result?.storeAudit?.aboutGame?.status;

  const statusValue: Record<string, number> = {
    Pass: 100,
    Warning: 70,
    Fail: 40,
  };

  const values = [shortStatus, aboutStatus]
    .map((status) => statusValue[status] ?? 70);

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg);
}

function NewAuditPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledInput = searchParams.get("input") ?? "";
  const [showEngine, setShowEngine] = useState(Boolean(prefilledInput));
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentPhase = useMemo(() => loadingPhases[phaseIndex], [phaseIndex]);

  useEffect(() => {
    if (!prefilledInput) return;

    setShowEngine(true);
    setInput(prefilledInput);
  }, [prefilledInput]);

  const onRunAudit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    setPhaseIndex(0);

    const supabase = createClient();
    if (!supabase) {
      setError(missingSupabaseClientEnvMessage);
      setIsLoading(false);
      return;
    }

    const phaseTimer = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, loadingPhases.length - 1));
    }, 1100);

    try {
      const isUrl = input.includes("store.steampowered.com/app/");
      let appId = "";

      if (isUrl) {
        const match = input.match(/\/app\/(\d+)/);
        if (match) appId = match[1];
      } else {
        const idMatch = input.match(/^(\d{5,10})$/);
        if (idMatch) appId = idMatch[1];
      }

      const auditRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userGame: input,
          isUrl,
          appId,
        }),
      });

      if (!auditRes.ok) {
        let apiMessage = "Audit failed. Please try again.";

        try {
          const errorJson = await auditRes.json();
          if (typeof errorJson?.error === "string" && errorJson.error.trim()) {
            apiMessage = errorJson.error;
          }
        } catch {
          // Ignore JSON parse errors and keep generic message.
        }

        throw new Error(apiMessage);
      }

      const reportJson = await auditRes.json();
      const vaporScore = getVaporScore(reportJson);

      let gameName = "Untitled Steam Project";
      if (appId) {
        const nameRes = await fetch(`/api/steam-app?appid=${appId}`);
        if (nameRes.ok) {
          const nameJson = await nameRes.json();
          gameName = nameJson?.name || gameName;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("reports")
        .insert({
          user_id: user?.id,
          game_name: gameName,
          vaporscore: vaporScore,
          report_json: reportJson,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while running audit.";
      setError(message);
    } finally {
      clearInterval(phaseTimer);
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8" suppressHydrationWarning>
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-3">Run New Audit</p>
      <h2 className="text-2xl font-black text-white mb-3">Start A Fresh Market Read</h2>
      <p className="text-slate-400 mb-6 max-w-2xl">
        Paste a Steam URL or AppID to generate a new Strategic Gap Analysis and competitor snapshot.
      </p>

      {prefilledInput && (
        <div className="mb-6 rounded-2xl border border-blue-600/30 bg-blue-600/10 px-4 py-3 text-sm text-blue-200">
          Your landing-page preview is loaded below. Run the full audit to unlock the full report and save it to your library.
        </div>
      )}

      {!showEngine && (
        <button
          onClick={() => setShowEngine(true)}
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 transition-all"
        >
          Open Audit Engine
        </button>
      )}

      {showEngine && (
        <form onSubmit={onRunAudit} className="space-y-5 mt-2">
          <div className="relative rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">
              Steam URL or AppID
            </label>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="https://store.steampowered.com/app/..."
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 transition-all"
          >
            {isLoading ? "Running Audit..." : "Run Audit"}
          </button>

          {isLoading && (
            <div className="rounded-3xl border border-blue-600/30 bg-blue-600/10 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                <p className="text-blue-300 font-semibold">{currentPhase}</p>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${((phaseIndex + 1) / loadingPhases.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm border border-red-500/30 bg-red-500/10 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

export default function NewAuditPage() {
  return (
    <Suspense>
      <NewAuditPageInner />
    </Suspense>
  );
}
