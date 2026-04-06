import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Only "pro" is a valid plan in the current billing_price_map schema.
const VALID_PLAN_KEYS = new Set(["pro"]);

type PaddleRuntimeEnvironment = "production" | "sandbox";

type CheckoutRequestBody = {
  planKey?: unknown;
};

type BillingPriceRow = {
  paddle_price_id: string;
};

function getPaddleEnvironment(): PaddleRuntimeEnvironment {
  const configuredEnvironment =
    process.env.PADDLE_ENV?.trim().toLowerCase() ??
    process.env.NEXT_PUBLIC_PADDLE_ENV?.trim().toLowerCase();

  return configuredEnvironment === "production" || configuredEnvironment === "live"
    ? "production"
    : "sandbox";
}

function getConfiguredPriceId(planKey: string, environment: PaddleRuntimeEnvironment) {
  const normalizedPlanKey = planKey.trim().toUpperCase().replace(/-/g, "_");
  const specificKey =
    environment === "production"
      ? `PADDLE_${normalizedPlanKey}_PRICE_ID_LIVE`
      : `PADDLE_${normalizedPlanKey}_PRICE_ID_SANDBOX`;

  const specificPriceId = process.env[specificKey]?.trim();
  if (specificPriceId) {
    return specificPriceId;
  }

  const genericPriceId = process.env[`PADDLE_${normalizedPlanKey}_PRICE_ID`]?.trim();
  return genericPriceId || null;
}

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

  const paddleEnvironment = getPaddleEnvironment();
  const configuredPriceId = getConfiguredPriceId(planKey, paddleEnvironment);

  if (configuredPriceId) {
    return NextResponse.json({
      priceId: configuredPriceId,
      userId: user.id,
      email: user.email ?? null,
    });
  }

  if (paddleEnvironment === "production") {
    return NextResponse.json(
      {
        error:
          "Missing live Paddle price configuration. Set PADDLE_PRO_PRICE_ID_LIVE in production.",
      },
      { status: 500 }
    );
  }

  // 3. Sandbox/local fallback: look up the active Paddle price for this plan from
  //    billing_price_map when no sandbox override env var is configured.
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
