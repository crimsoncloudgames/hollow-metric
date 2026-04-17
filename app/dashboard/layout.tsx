"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CreditsBalanceLabel } from "@/components/credits-balance-label";
import { TestingAdminAccessProvider } from "@/components/testing-admin-access-provider";
import { hasLaunchPlannerAccess } from "@/lib/billing";
import { createClient, missingSupabaseClientEnvMessage } from "@/utils/supabase/client";
import {
  LayoutDashboard,
  Rocket,
  Search,
  FolderOpen,
  DollarSign,
  Coins,
  Tag,
  Settings,
  LogOut,
  Lightbulb,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, isPrimary: false },
  { href: "/dashboard/budgeter", label: "Launch Budget", icon: DollarSign, isPrimary: true },
  { href: "/dashboard/financial-library", label: "Financial Library", icon: FolderOpen, isPrimary: false },
  { href: "/dashboard/game-idea-generator", label: "Game Idea Generator", icon: Lightbulb, isPrimary: false },
  { href: "/dashboard/credits", label: "Buy Credits", icon: Coins, isPrimary: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, isPrimary: false },
];

const comingSoonItems = [
  { label: "Steam Tag Tool", icon: Tag },
  { label: "Steam Page Analysis", icon: Rocket },
  { label: "Creator Discovery", icon: Search },
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
      subtitle: "Track your launch budget, test price points, and spot risky spending before expensive decisions are locked in.",
    };
  }

  if (pathname === "/dashboard/new-audit") {
    return {
      title: "Steam Page Analysis",
      subtitle: "This feature is not part of the current launch product.",
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

  if (pathname === "/dashboard/game-idea-generator") {
    return {
      title: "Game Idea Generator",
      subtitle: "Shape a game concept from genre, mechanics, features, setting, mood, and your own idea notes.",
    };
  }

  if (pathname === "/dashboard/steam-tag-tool") {
    return {
      title: "Steam Tag Tool",
      subtitle: "A simple tool to generate the best Steam tags for a game.",
    };
  }

  if (pathname === "/dashboard/credits") {
    return {
      title: "Buy Credits",
      subtitle: "Use credits for AI-powered tools that are listed below. Credits are only charged when a generation succeeds.",
    };
  }

  if (pathname === "/dashboard/settings") {
    return {
      title: "Settings",
      subtitle: "Manage your account, subscription, defaults, and data controls.",
    };
  }

  return {
    title: "Launch Decision Workspace",
    subtitle: "Track your launch budget, test price points, and spot risky spending before expensive decisions are locked in.",
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = "dark" as const;
  const [userLabel, setUserLabel] = useState("Account");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUpgradeButton, setShowUpgradeButton] = useState(false);
  const [mobileNavigationMenuPath, setMobileNavigationMenuPath] = useState<string | null>(null);
  const header = getHeaderText(pathname);
  const isMobileNavigationOpen = mobileNavigationMenuPath === pathname;
  const showPageHeader = pathname !== "/dashboard" && pathname !== "/dashboard/library";
  const creditsBadgeClassName =
    "inline-flex w-full items-center justify-center gap-3 self-start rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-blue-400/40 hover:bg-blue-500/15 sm:w-auto sm:justify-start";
  const creditsBalanceBadgeContent = (
    <>
      <Coins size={17} className="text-blue-300" />
      <CreditsBalanceLabel className="text-sm font-black tracking-[0.02em] text-white" />
    </>
  );
  const creditsBalanceBadge = (
    <Link href="/dashboard/credits" className={creditsBadgeClassName}>
      {creditsBalanceBadgeContent}
    </Link>
  );

  useEffect(() => {
    localStorage.setItem("hm_theme", theme);
    document.documentElement.dataset.theme = theme;
  }, []);

  useEffect(() => {
    let mounted = true;

    const handleAuthFailure = (error: unknown) => {
      console.error("Failed to verify dashboard auth state", error);

      if (!mounted) {
        return;
      }

      setUserLabel("Account");
      setUserEmail(null);
      setShowUpgradeButton(false);
      setIsAuthenticated(false);
      setIsAuthChecked(true);
      router.replace("/login");
    };

    const loadUser = async () => {
      try {
        const supabase = createClient();
        if (!supabase) {
          if (!mounted) return;
          setUserLabel("Account");
          setUserEmail(null);
          setIsAuthenticated(false);
          setIsAuthChecked(true);
          router.replace("/login");
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user?.email) {
          setUserLabel(user.email);
          setUserEmail(user.email);
        } else {
          setUserLabel("Account");
          setUserEmail(null);
        }

        if (!user) {
          setShowUpgradeButton(false);
          setIsAuthenticated(false);
          setIsAuthChecked(true);
          router.replace("/login");
          return;
        }

        const { data: entitlement, error: entitlementError } = await supabase
          .from("user_entitlements")
          .select("tier, premium_access, billing_state")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (entitlementError) {
          console.error("Failed to load dashboard entitlement state for navigation", entitlementError);
          setShowUpgradeButton(false);
        } else {
          setShowUpgradeButton(!hasLaunchPlannerAccess(entitlement));
        }

        setIsAuthenticated(true);
        setIsAuthChecked(true);
      } catch (error) {
        handleAuthFailure(error);
      }
    };

    const supabase = createClient();
    const authSubscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        posthog.reset();
        setUserLabel("Account");
        setUserEmail(null);
        setShowUpgradeButton(false);
        setIsAuthenticated(false);
        setIsAuthChecked(true);
        router.replace("/login");
        router.refresh();
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        posthog.identify(session.user.id, { email: session.user.email });
      }

      if (session.user.email) {
        setUserLabel(session.user.email);
        setUserEmail(session.user.email);
      } else {
        setUserEmail(null);
      }
      setIsAuthenticated(true);
      setIsAuthChecked(true);
    });

    const refresh = () => {
      void loadUser();
    };

    void loadUser();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    const intervalId = window.setInterval(refresh, 15000);

    return () => {
      mounted = false;
      authSubscription?.data.subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.clearInterval(intervalId);
    };
  }, [router]);

  if (!isAuthChecked || !isAuthenticated) {
    return (
      <div className={[
        "min-h-screen p-6",
        theme === "dark" ? "bg-slate-950 text-slate-300" : "bg-slate-100 text-slate-700",
      ].join(" ")}>
        <p className="text-sm font-semibold">Checking account access...</p>
      </div>
    );
  }

  return (
    <TestingAdminAccessProvider userEmail={userEmail}>
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              onClick={() => setMobileNavigationMenuPath(null)}
              className="inline-flex min-w-0 items-center gap-3"
            >
              <Image
                src="/HM Logo Icon.ico"
                alt="Hollow Metric logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover"
                priority
              />
              <div
                className={[
                  "min-w-0 text-lg font-black italic tracking-tight sm:text-2xl",
                  theme === "dark" ? "text-white" : "text-slate-900",
                ].join(" ")}
              >
                <span className="block truncate">Hollow Metric</span>
                <span className="mt-1 inline-block text-[10px] font-black not-italic text-blue-500 sm:text-sm">
                  v0.6.7
                </span>
              </div>
            </Link>
            <p
              className={[
                "mt-2 text-[10px] font-bold uppercase tracking-[0.25em]",
                theme === "dark" ? "text-slate-500" : "text-slate-600",
              ].join(" ")}
            >
              Launch Planning Suite
            </p>
          </div>

          <button
            type="button"
            aria-expanded={isMobileNavigationOpen}
            aria-controls="dashboard-navigation"
            aria-label={isMobileNavigationOpen ? "Close dashboard navigation" : "Open dashboard navigation"}
            onClick={() =>
              setMobileNavigationMenuPath((current) =>
                current === pathname ? null : pathname
              )
            }
            className={[
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border lg:hidden",
              theme === "dark"
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-600/40 hover:text-blue-400"
                : "border-slate-300 bg-slate-200 text-slate-800 hover:border-blue-500/40 hover:text-blue-700",
            ].join(" ")}
          >
            {isMobileNavigationOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div
          id="dashboard-navigation"
          className={[
            "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out lg:mt-6 lg:max-h-none lg:overflow-visible lg:opacity-100",
            isMobileNavigationOpen ? "mt-6 max-h-[80vh] opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
        <div className="space-y-5 pb-1 lg:flex lg:h-[calc(100vh-8.5rem)] lg:flex-col lg:overflow-y-auto lg:pb-0">
        <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavigationMenuPath(null)}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-3 py-3 border transition-all duration-200 font-semibold sm:col-span-2 md:col-span-1 lg:col-span-1",
                    isActive
                      ? "border-blue-600/60 text-white bg-blue-600 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40"
                      : theme === "dark"
                        ? "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                        : "border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-200",
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
                onClick={() => setMobileNavigationMenuPath(null)}
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

          {showUpgradeButton ? (
            <Link
              href="/dashboard/settings#subscription"
              onClick={() => setMobileNavigationMenuPath(null)}
              className="mt-1 flex items-center justify-center gap-2 rounded-2xl border border-blue-600/40 bg-blue-600/10 px-3 py-3 text-sm font-semibold text-blue-300 transition-all duration-200 hover:bg-blue-600/20 sm:col-span-2 md:col-span-1 lg:col-span-1"
            >
              <ArrowUpRight size={16} />
              <span>Upgrade</span>
            </Link>
          ) : null}
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
              router.replace("/login");
              router.refresh();
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
          <a
            href="https://discord.gg/tQMqtQAsz9"
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "mt-3 block w-full rounded-2xl border transition-all px-3 py-2 text-sm font-semibold text-center",
              theme === "dark"
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-600/40 hover:text-blue-400"
                : "border-slate-300 bg-slate-200 text-slate-800 hover:border-blue-500/40 hover:text-blue-700",
            ].join(" ")}
          >
            Discord
          </a>
        </div>
        </div>
        </div>
      </aside>

      <main className={[
        "min-h-screen flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 xl:p-10 2xl:p-12",
        theme === "dark" ? "bg-slate-950" : "bg-slate-100",
      ].join(" ")}>
        {showPageHeader ? (
          <header className="mb-10 border-b border-slate-900 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{header.title}</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500 sm:text-base">{header.subtitle}</p>
              </div>
              {creditsBalanceBadge}
            </div>
          </header>
        ) : (
          <div className="mb-6 flex justify-stretch sm:justify-end">{creditsBalanceBadge}</div>
        )}

        <div className="transition-all duration-300">{children}</div>
      </main>
      </div>
    </TestingAdminAccessProvider>
  );
}
