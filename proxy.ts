import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { COOKIE_NAMES } from "@/lib/cookie-consent";
import { isSupabaseUserEmailVerified } from "@/lib/verified-user";

const NOINDEX_HEADER_VALUE = "noindex, nofollow";

function getSafeRedirectPath(candidate: string | null) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }

  return candidate;
}

function shouldNoIndexPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/dashboard") ||
    pathname === "/landing/dashboard" ||
    pathname.startsWith("/landing/dashboard/")
  );
}

function applyNoIndexHeader(response: NextResponse) {
  response.headers.set("X-Robots-Tag", NOINDEX_HEADER_VALUE);
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const shouldNoIndex = shouldNoIndexPath(pathname);

  if (pathname === "/landing/dashboard" || pathname.startsWith("/landing/dashboard/")) {
    const normalizedPath = pathname.replace("/landing", "");
    return applyNoIndexHeader(
      NextResponse.redirect(new URL(`${normalizedPath}${request.nextUrl.search}`, request.url))
    );
  }

  // Auth pages only need the noindex header and do not require Supabase user lookups.
  if (!isDashboardRoute) {
    const response = NextResponse.next();
    if (shouldNoIndex) {
      applyNoIndexHeader(response);
    }

    return response;
  }

  const { supabase, supabaseResponse } = createClient(request);
  const secureCookies = request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";

  if (!supabase) {
    if (isDashboardRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return applyNoIndexHeader(NextResponse.redirect(loginUrl));
    }

    if (shouldNoIndex) {
      applyNoIndexHeader(supabaseResponse);
    }

    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasVerifiedDashboardAccess = Boolean(user && isSupabaseUserEmailVerified(user));

  if (!hasVerifiedDashboardAccess && isDashboardRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", getSafeRedirectPath(`${pathname}${request.nextUrl.search}`));
    return applyNoIndexHeader(NextResponse.redirect(loginUrl));
  }

  if (shouldNoIndex) {
    applyNoIndexHeader(supabaseResponse);
  }

  supabaseResponse.cookies.set(COOKIE_NAMES.authState, user ? "signed-in" : "guest", {
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: secureCookies,
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/landing/dashboard",
    "/landing/dashboard/:path*",
  ],
};
