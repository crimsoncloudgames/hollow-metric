import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

function getPaddleEnvironment() {
  const normalizedEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENV?.trim().toLowerCase();
  return normalizedEnvironment === "production" || normalizedEnvironment === "live"
    ? "production"
    : "sandbox";
}

function getProSubscriptionPriceId() {
  const environment = getPaddleEnvironment();

  if (environment === "production") {
    return (
      process.env.PADDLE_PRO_PRICE_ID_LIVE?.trim() ??
      process.env.PADDLE_LAUNCH_PLANNER_PRICE_ID_LIVE?.trim() ??
      process.env.PADDLE_PRO_PRICE_ID?.trim() ??
      process.env.PADDLE_LAUNCH_PLANNER_PRICE_ID?.trim() ??
      process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID?.trim() ??
      process.env.NEXT_PUBLIC_PADDLE_LAUNCH_PLANNER_PRICE_ID?.trim() ??
      ""
    );
  }

  return (
    process.env.PADDLE_PRO_PRICE_ID_SANDBOX?.trim() ??
    process.env.PADDLE_LAUNCH_PLANNER_PRICE_ID_SANDBOX?.trim() ??
    process.env.PADDLE_PRO_PRICE_ID?.trim() ??
    process.env.PADDLE_LAUNCH_PLANNER_PRICE_ID?.trim() ??
    process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID?.trim() ??
    process.env.NEXT_PUBLIC_PADDLE_LAUNCH_PLANNER_PRICE_ID?.trim() ??
    ""
  );
}

function getProCheckoutUnavailableMessage() {
  return getPaddleEnvironment() === "production"
    ? "Pro checkout is not configured right now. Add PADDLE_PRO_PRICE_ID_LIVE and try again."
    : "Pro checkout is not configured right now. Add PADDLE_PRO_PRICE_ID_SANDBOX and try again.";
}

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  if (!supabase) {
    return NextResponse.json({ error: "Supabase configuration error." }, { status: 500 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const priceId = getProSubscriptionPriceId();
  if (!priceId) {
    return NextResponse.json({ error: getProCheckoutUnavailableMessage() }, { status: 503 });
  }

  return NextResponse.json({
    priceId,
    planKey: "pro",
    userId: user.id,
    email: user.email ?? null,
  });
}
