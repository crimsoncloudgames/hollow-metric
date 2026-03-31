"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";
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
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200 lg:flex-row">
      <aside className="w-full border-b border-slate-900 bg-slate-950 px-4 py-4 sm:px-5 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:py-6">
        <div className="mb-6 lg:mb-10">
          <Link href="/landing" className="inline-flex items-center gap-3">
            <Image
              src="/HM Logo Icon.webp"
              alt="Hollow Metric logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover"
              priority
            />
            <div className="text-xl font-black italic tracking-tight text-white sm:text-2xl">
              Hollow Metric <span className="text-blue-500 text-sm not-italic ml-1">v0.3.3</span>
            </div>
          </Link>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.25em] mt-2 font-bold">
            Market Intelligence Engine
          </p>
        </div>

        <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
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

        <div className="mt-5 border-t border-slate-900 pt-4 lg:mt-auto">
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
              if (!supabase) {
                console.error(missingSupabaseClientEnvMessage);
                return;
              }

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

      <main className="min-h-screen flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-12">
        <header className="mb-10 border-b border-slate-900 pb-6">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{header.title}</h1>
          <p className="text-slate-500 mt-2">{header.subtitle}</p>
        </header>

        <div className="transition-all duration-300">{children}</div>
      </main>
    </div>
  );
}
