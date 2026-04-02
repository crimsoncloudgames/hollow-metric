import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { COOKIE_NAMES } from "@/lib/cookie-consent";

function getSafeRedirectPath(candidate: string | null) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/dashboard";
  }

  return candidate;
}

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);
  const secureCookies = request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";

  if (!supabase) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith("/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isDashboardRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
