"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  matchPaths?: string[];
};

const desktopNavItems: NavItem[] = [
  { href: "/pricing", label: "Pricing" },
  { href: "/launch-math-audit", label: "Launch Math Audit" },
  { href: "/resources", label: "Resources" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact" },
];

const mobileNavItems: NavItem[] = [
  { href: "/", label: "Home", matchPaths: ["/", "/landing"] },
  ...desktopNavItems,
];

function isActivePath(pathname: string, item: NavItem) {
  const matchPaths = item.matchPaths ?? [item.href];
  return matchPaths.includes(pathname);
}

function getDesktopLinkClass(isActive: boolean) {
  return isActive ? "text-blue-300" : "transition hover:text-blue-400";
}

function getMobileLinkClass(isActive: boolean) {
  return [
    "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition",
    isActive
      ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
      : "border-slate-800 bg-slate-900/70 text-slate-200 hover:border-blue-500/40 hover:text-blue-300",
  ].join(" ");
}

export default function PublicSiteHeader() {
  const pathname = usePathname();
  const [menuPathname, setMenuPathname] = useState<string | null>(null);
  const isMenuOpen = menuPathname === pathname;

  return (
    <div className="sticky top-0 z-30 mt-4">
      <header className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/80 px-4 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.22)] backdrop-blur-xl sm:px-6 md:rounded-full">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <Link
            href="/"
            className="relative inline-block w-[min(50vw,11.5rem)] shrink-0 sm:w-[min(38vw,15rem)] md:w-[17rem]"
          >
            <Image
              src="/HM logo icon with text webP.webp"
              alt="Hollow Metric"
              width={1200}
              height={300}
              style={{ width: "100%", height: "auto" }}
              priority
            />
            <p className="absolute bottom-[6%] left-[34%] hidden whitespace-nowrap text-[9px] font-medium leading-none text-slate-500 sm:block md:text-[10px]">
              A tool by Crimson Cloud Games
            </p>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            {desktopNavItems.map((item) => {
              const isActive = isActivePath(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={getDesktopLinkClass(isActive)}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link href="/login" className="transition hover:text-blue-400">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500"
            >
              Sign Up
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              aria-controls="public-site-mobile-menu"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() =>
                setMenuPathname((current) => (current === pathname ? null : pathname))
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-100 transition hover:border-blue-500 hover:text-blue-300"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div
        id="public-site-mobile-menu"
        className={[
          "overflow-hidden transition-[max-height,opacity,transform,margin] duration-300 ease-out md:hidden",
          isMenuOpen
            ? "mt-3 max-h-[30rem] translate-y-0 opacity-100"
            : "pointer-events-none max-h-0 -translate-y-2 opacity-0",
        ].join(" ")}
      >
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/95 p-4 shadow-[0_24px_60px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
          <nav className="grid gap-2">
            {mobileNavItems.map((item) => {
              const isActive = isActivePath(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={getMobileLinkClass(isActive)}
                >
                  <span>{item.label}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Open
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-blue-500/40 hover:text-blue-300"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}