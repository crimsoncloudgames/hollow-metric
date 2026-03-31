"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Rocket,
  FolderOpen,
  DollarSign,
  Settings,
  LogOut,
  UserCircle2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard/new-audit", label: "Run New Audit", icon: Rocket },
  { href: "/dashboard", label: "My Library", icon: FolderOpen },
  { href: "/dashboard/budgeter", label: "Budgeter", icon: DollarSign },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function getHeaderText(pathname: string) {
  if (pathname.startsWith("/dashboard/reports/")) {
    return {
      title: "Report Detail",
      subtitle: "Deep dive into competitor signals, copywriting feedback, and strategic gaps.",
    };
  }

  if (pathname === "/dashboard/new-audit") {
    return {
      title: "Welcome, Developer",
      subtitle: "Run a fresh market audit and uncover your next strategic move.",
    };
  }

  if (pathname === "/dashboard/budgeter") {
    return {
      title: "Budget Strategy Workspace",
      subtitle: "Model art, trailer, and ad spend with genre-aware benchmarks.",
    };
  }

  if (pathname === "/dashboard/settings") {
    return {
      title: "Account & Integrations",
      subtitle: "Manage your profile, auth provider, and API key settings.",
    };
  }

  return {
    title: "Project: Ashes of the Damned",
    subtitle: "Audit history and performance snapshots for your active project.",
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const header = getHeaderText(pathname);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      <aside className="w-64 h-screen border-r border-slate-900 bg-slate-950 flex flex-col px-5 py-6 sticky top-0">
        <div className="mb-10">
          <Link href="/landing" className="inline-block">
            <div className="text-2xl font-black italic text-white tracking-tight">
              Hollow Metric <span className="text-blue-500 text-sm not-italic ml-1">v0.3.3</span>
            </div>
          </Link>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.25em] mt-2 font-bold">
            Market Intelligence Engine
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname.startsWith("/dashboard/reports/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all duration-200",
                  isActive
                    ? "border-blue-600/40 text-blue-500 bg-blue-500/5 shadow-[0_0_18px_rgba(59,130,246,0.18)]"
                    : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900",
                ].join(" ")}
              >
                <Icon size={17} />
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-900 pt-4">
          <div className="flex items-center gap-3 mb-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2">
            <UserCircle2 size={18} className="text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-200">Developer Mode</p>
              <p className="text-xs text-slate-500">indie@studio.dev</p>
            </div>
          </div>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-600/40 hover:text-blue-400 transition-all px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-slate-950 p-12 overflow-y-auto min-h-screen">
        <header className="mb-10 border-b border-slate-900 pb-6">
          <h1 className="text-3xl font-black text-white tracking-tight">{header.title}</h1>
          <p className="text-slate-500 mt-2">{header.subtitle}</p>
        </header>

        <div className="transition-all duration-300">{children}</div>
      </main>
    </div>
  );
}
