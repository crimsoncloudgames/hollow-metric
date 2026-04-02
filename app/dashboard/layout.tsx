"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";
import {
  LayoutDashboard,
  Rocket,
  Tag,
  CreditCard,
  FolderOpen,
  DollarSign,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, isPrimary: false },
  { href: "/dashboard/budgeter", label: "Launch Budget", icon: DollarSign, isPrimary: true },
  { href: "/dashboard/financial-library", label: "Financial Library", icon: FolderOpen, isPrimary: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, isPrimary: false },
];

const comingSoonItems = [
  { label: "Tag Generator", icon: Tag },
  { label: "Steam Page Analysis", icon: Rocket },
  { label: "Buy Credits", icon: CreditCard },
];

function getHeaderText(pathname: string) {
  if (pathname.startsWith("/dashboard/reports/")) {
    return {
      title: "Launch Report",
      subtitle: "Review your financial analysis and launch readiness.",
    };
  }

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return {
      title: "Launch Decision Workspace",
      subtitle: "Track your launch budget, test price points, and catch weak spending before expensive decisions are locked in.",
    };
  }

  if (pathname === "/dashboard/new-audit") {
    return {
      title: "Steam Page Analysis",
      subtitle: "This feature is not part of the current launch product.",
    };
  }

  if (pathname === "/dashboard/tag-generator") {
    return {
      title: "Tag Generator",
      subtitle: "Create SEO-optimized tags and keywords for your Steam store listing.",
    };
  }

  if (pathname === "/dashboard/budgeter") {
    return {
      title: "Launch Budget",
      subtitle: "Estimate costs, test price points, and track your path to break-even.",
    };
  }

  if (pathname === "/dashboard/financial-library") {
    return {
      title: "Financial Library",
      subtitle: "Save and revisit your launch budget projects.",
    };
  }

  if (pathname === "/dashboard/settings") {
    return {
      title: "Settings",
      subtitle: "Manage your account, subscription, defaults, and data controls.",
    };
  }

  if (pathname === "/dashboard/credits") {
    return {
      title: "Buy Credits",
      subtitle: "Top up your account for tag generation and additional analyses.",
    };
  }

  return {
    title: "Launch Decision Workspace",
    subtitle: "Track your launch budget, test price points, and catch weak spending before expensive decisions are locked in.",
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [userLabel, setUserLabel] = useState("Account");
  const header = getHeaderText(pathname);

  useEffect(() => {
    const savedTheme = localStorage.getItem("hm_theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("hm_theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const supabase = createClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (user?.email) {
        setUserLabel(user.email);
      }

      if (!user) {
        return;
      }
    };

    const refresh = () => {
      void loadUser();
    };

    void loadUser();
    window.addEventListener("focus", refresh);
    const intervalId = window.setInterval(refresh, 15000);

    return () => {
      mounted = false;
      window.removeEventListener("focus", refresh);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={[
      "dashboard-shell flex min-h-screen flex-col lg:flex-row",
      theme === "dark" ? "bg-slate-950 text-slate-200" : "bg-slate-100 text-slate-900",
    ].join(" ")}>
      <aside className={[
        "w-full px-4 py-4 sm:px-5 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:py-6",
        theme === "dark"
          ? "border-b border-slate-900 bg-slate-950 lg:border-b-0 lg:border-r"
          : "border-b border-slate-300 bg-white lg:border-b-0 lg:border-r",
      ].join(" ")}>
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
            <div className={[
              "text-xl font-black italic tracking-tight sm:text-2xl",
              theme === "dark" ? "text-white" : "text-slate-900",
            ].join(" ")}>
              Hollow Metric <span className="text-blue-500 text-sm not-italic ml-1">0.4.3</span>
            </div>
          </Link>
          <p className={[
            "text-[10px] uppercase tracking-[0.25em] mt-2 font-bold",
            theme === "dark" ? "text-slate-500" : "text-slate-600",
          ].join(" ")}>
            Launch Planning Suite
          </p>
        </div>

        <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-3 py-3 border transition-all duration-200 font-semibold sm:col-span-2 lg:col-span-1",
                    isActive
                      ? "border-blue-600/60 text-white bg-blue-600 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40"
                      : theme === "dark"
                        ? "border-blue-600/30 text-blue-200 bg-blue-600/10 hover:border-blue-600/50 hover:bg-blue-600/15 hover:text-blue-100"
                        : "border-blue-300 text-blue-700 bg-blue-100 hover:border-blue-400 hover:bg-blue-200 hover:text-blue-800",
                  ].join(" ")}
                >
                  <Icon size={17} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all duration-200",
                  isActive
                    ? "border-blue-600/40 text-blue-500 bg-blue-500/5 shadow-[0_0_18px_rgba(59,130,246,0.18)]"
                    : theme === "dark"
                      ? "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                      : "border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-200",
                ].join(" ")}
              >
                <Icon size={17} />
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 space-y-2">
          <p className={["px-2 text-[10px] font-black uppercase tracking-[0.2em]", theme === "dark" ? "text-slate-500" : "text-slate-600"].join(" ")}>
            Coming Soon
          </p>
          {comingSoonItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                aria-disabled="true"
                className={[
                  "flex items-center gap-3 rounded-2xl border px-3 py-2.5 opacity-65",
                  theme === "dark"
                    ? "cursor-not-allowed border-slate-900 bg-slate-950 text-slate-500"
                    : "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                <Icon size={17} />
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className={[
          "mt-5 pt-4 lg:mt-auto",
          theme === "dark" ? "border-t border-slate-900" : "border-t border-slate-300",
        ].join(" ")}>
          <button
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            className={[
              "w-full mb-3 rounded-2xl border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all",
              theme === "dark"
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-600/40 hover:text-blue-400"
                : "border-slate-300 bg-slate-200 text-slate-800 hover:border-blue-500/40 hover:text-blue-700",
            ].join(" ")}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </button>
          <button
            type="button"
            className={[
              "w-full mb-3 rounded-2xl border px-3 py-2 text-sm font-semibold text-left transition-all truncate",
              theme === "dark"
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-600/40"
                : "border-slate-300 bg-slate-200 text-slate-800 hover:border-blue-500/40",
            ].join(" ")}
            title={userLabel}
          >
            {userLabel}
          </button>
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
            className={[
              "w-full rounded-2xl border transition-all px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2",
              theme === "dark"
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-600/40 hover:text-blue-400"
                : "border-slate-300 bg-slate-200 text-slate-800 hover:border-blue-500/40 hover:text-blue-700",
            ].join(" ")}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className={[
        "min-h-screen flex-1 overflow-y-auto p-4 sm:p-6 lg:p-12",
        theme === "dark" ? "bg-slate-950" : "bg-slate-100",
      ].join(" ")}>
        {pathname !== "/dashboard" && pathname !== "/dashboard/library" && (
          <header className="mb-10 border-b border-slate-900 pb-6">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{header.title}</h1>
            <p className="text-slate-500 mt-2">{header.subtitle}</p>
          </header>
        )}

        <div className="transition-all duration-300">{children}</div>
      </main>
    </div>
  );
}
