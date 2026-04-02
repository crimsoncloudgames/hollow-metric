"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DollarSign, Tag, ArrowRight } from "lucide-react";
import {
  type FinancialProject,
  getSavedFinancialProjects,
} from "@/lib/financial-projects";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  // TODO(security): Replace localStorage project reads with user-scoped server data protected by Supabase RLS.
  const [projects, setProjects] = useState<FinancialProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = () => {
    setIsLoading(true);
    setProjects(getSavedFinancialProjects());
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      loadProjects();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "hm_financial_projects") {
        loadProjects();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const activeProject = projects[0] ?? null;
  const recentCount = projects.length;
  const warningCount = activeProject && activeProject.budgetStatus.toLowerCase() !== "balanced" ? 1 : 0;

  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
          Launch Decision Workspace
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Track your launch budget, test price points, and catch weak spending before expensive decisions are locked in.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Current Break-Even</p>
          <p className="text-3xl font-black text-blue-500">
            {activeProject ? `${activeProject.roughBreakEvenCopies.toLocaleString()}` : "Not calculated yet"}
          </p>
          <p className="text-slate-500 text-sm mt-2">copies to sell</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Total Planned Spend</p>
          <p className="text-3xl font-black text-white">
            {activeProject ? formatCurrency(activeProject.totalPlannedSpend) : "No budget saved yet"}
          </p>
          <p className="text-slate-500 text-sm mt-2">launch costs</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Last Updated</p>
          <p className="text-2xl font-black text-white">{activeProject ? activeProject.lastUpdated : "No saved project"}</p>
          <p className="text-slate-500 text-sm mt-2">{activeProject ? activeProject.name : "project name"}</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Active Warnings</p>
          <p className="text-3xl font-black text-blue-500">{activeProject ? warningCount.toString() : "None yet"}</p>
          <p className="text-slate-500 text-sm mt-2">issues to address</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/dashboard/budgeter"
          className="group relative rounded-3xl border border-blue-600/40 bg-gradient-to-br from-blue-600/20 to-blue-600/5 hover:border-blue-600/60 hover:from-blue-600/30 transition-all p-8 shadow-lg hover:shadow-xl hover:shadow-blue-600/20"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white mb-2">Launch Budget</h2>
              <p className="text-slate-400 max-w-xs text-sm mb-4">
                Estimate your launch costs, test price points, and track your path to break-even.
              </p>
            </div>
            <div className="rounded-2xl bg-blue-600/20 p-3 group-hover:bg-blue-600/30 transition-all">
              <DollarSign size={24} className="text-blue-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-400 group-hover:gap-3 transition-all mt-4">
            <span className="text-sm font-semibold">Open Launch Budget</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-2">Secondary Tool</p>
              <h2 className="text-2xl font-black text-white mb-2">Tag Generator</h2>
              <p className="text-slate-400 max-w-xs text-sm mb-4">
                Coming soon. Generate Steam tags and keyword ideas once this feature is live.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-800/50 p-3">
              <Tag size={24} className="text-slate-400" />
            </div>
          </div>
          <button
            type="button"
            disabled
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-400 opacity-80"
          >
            Available Soon
          </button>
        </div>
      </div>

      {recentCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-white">Recent Projects</h3>
            <Link href="/dashboard/financial-library" className="text-blue-400 hover:text-blue-300 transition-all font-semibold text-sm flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project) => (
              <Link
                key={project.id}
                href="/dashboard/financial-library"
                className="group rounded-3xl border border-slate-800 bg-slate-900/60 hover:border-blue-600/40 transition-all p-6 hover:shadow-xl hover:shadow-blue-600/10"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-3">Launch Project</p>
                <h4 className="text-lg font-black text-white mb-3 group-hover:text-blue-400 transition-all line-clamp-2">
                  {project.name}
                </h4>

                <div className="space-y-2 text-sm">
                  <p className="text-slate-400"><span className="text-slate-500">Last updated:</span> {project.lastUpdated}</p>
                  <p className="text-slate-400"><span className="text-slate-500">Total planned spend:</span> {formatCurrency(project.totalPlannedSpend)}</p>
                  <p className="text-slate-400"><span className="text-slate-500">Main price point:</span> ${project.mainPricePoint.toFixed(2)}</p>
                  <p className="text-slate-400"><span className="text-slate-500">Rough break-even:</span> {project.roughBreakEvenCopies.toLocaleString()} copies</p>
                </div>

                <p className="mt-3 text-xs text-slate-500">Budget status: {project.budgetStatus}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isLoading && recentCount === 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p className="text-slate-200 font-semibold mb-2">No saved launch budgets yet.</p>
          <p className="text-slate-500 text-sm mb-6">Build your first budget to see it here.</p>
          <Link
            href="/dashboard/budgeter"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 transition-all"
          >
            <DollarSign size={16} />
            Build Launch Budget
          </Link>
        </div>
      )}
    </section>
  );
}
