import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const PRO_CHECKOUT_UNAVAILABLE_MESSAGE =
  "Pro checkout is not configured right now. Add a Paddle price ID and try again.";

function getProSubscriptionPriceId() {
  return (
    process.env.PADDLE_PRO_PRICE_ID?.trim() ??
    process.env.PADDLE_LAUNCH_PLANNER_PRICE_ID?.trim() ??
    process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID?.trim() ??
    process.env.NEXT_PUBLIC_PADDLE_LAUNCH_PLANNER_PRICE_ID?.trim() ??
    ""
  );
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
    return NextResponse.json({ error: PRO_CHECKOUT_UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  return NextResponse.json({
    priceId,
    planKey: "pro",
    userId: user.id,
    email: user.email ?? null,
  });
}
