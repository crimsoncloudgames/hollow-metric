import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Only "pro" is a valid plan in the current billing_price_map schema.
const VALID_PLAN_KEYS = new Set(["pro"]);

type CheckoutRequestBody = {
  planKey?: unknown;
};

type BillingPriceRow = {
  paddle_price_id: string;
};

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    return null;
  }

  return createAdminClient(url, serviceKey);
}

export async function POST(request: Request) {
  // 1. Authenticate the calling user via cookie-based server client.
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase configuration error." },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 2. Parse plan from request body; default to "pro".
  let body: CheckoutRequestBody = {};
  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    // Body is optional — fall through and use defaults.
  }

  const planKey =
    typeof body.planKey === "string" && body.planKey.trim()
      ? body.planKey.trim()
      : "pro";

  if (!VALID_PLAN_KEYS.has(planKey)) {
    return NextResponse.json(
      { error: `Unknown plan key: ${planKey}.` },
      { status: 400 }
    );
  }

  // 3. Look up the active Paddle price for this plan from billing_price_map.
  //    billing_price_map has no client RLS policies so service role is required.
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Billing service configuration error." },
      { status: 500 }
    );
  }

  const { data: priceRow, error: priceError } = await admin
    .from("billing_price_map")
    .select("paddle_price_id")
    .eq("plan_key", planKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<BillingPriceRow>();

  if (priceError) {
    console.error("billing_price_map lookup failed:", priceError.message);
    return NextResponse.json(
      { error: "Failed to look up pricing. Please try again." },
      { status: 500 }
    );
  }

  if (!priceRow?.paddle_price_id) {
    return NextResponse.json(
      { error: "No active price is configured for this plan." },
      { status: 404 }
    );
  }

  const priceId = priceRow.paddle_price_id.trim();

  if (!priceId) {
    return NextResponse.json(
      { error: "Configured Paddle price ID is empty." },
      { status: 500 }
    );
  }

  // 4. Return the checkout payload. The client passes this directly to
  //    openPaddleCheckout() from lib/paddle.ts which opens the Paddle overlay.
  return NextResponse.json({
    priceId,
    userId: user.id,
    email: user.email ?? null,
  });
}
