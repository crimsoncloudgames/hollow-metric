import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type LaunchMathAuditCheckoutPayload = {
  name?: string;
  email?: string;
  gameName?: string;
  steamUrl?: string;
  releaseWindow?: string;
  plannedPrice?: string;
  estimatedBudget?: string;
  biggestConcern?: string;
  referralCode?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NormalizedCheckoutPayload = {
  name: string;
  email: string;
  gameName: string;
  steamUrl: string;
  releaseWindow: string | null;
  plannedPrice: string | null;
  estimatedBudget: string;
  biggestConcern: string;
  referralCode: string | null;
};

function normalizeText(input: string | undefined, maxLength: number) {
  return (input ?? "").trim().slice(0, maxLength);
}

function normalizeOptionalText(input: string | undefined, maxLength: number) {
  const value = normalizeText(input, maxLength);
  return value || null;
}

function normalizePayload(payload: LaunchMathAuditCheckoutPayload): NormalizedCheckoutPayload {
  return {
    name: normalizeText(payload.name, 120),
    email: normalizeText(payload.email, 160).toLowerCase(),
    gameName: normalizeText(payload.gameName, 180),
    steamUrl: normalizeText(payload.steamUrl, 1000),
    releaseWindow: normalizeOptionalText(payload.releaseWindow, 120),
    plannedPrice: normalizeOptionalText(payload.plannedPrice, 120),
    estimatedBudget: normalizeText(payload.estimatedBudget, 120),
    biggestConcern: normalizeText(payload.biggestConcern, 3000),
    referralCode: normalizeOptionalText(payload.referralCode, 120),
  };
}

function validatePayload(payload: NormalizedCheckoutPayload) {
  if (!payload.name) {
    return "Please enter your name.";
  }

  if (!payload.email) {
    return "Please enter your email address.";
  }

  if (!EMAIL_PATTERN.test(payload.email)) {
    return "Please enter a valid email address.";
  }

  if (!payload.gameName) {
    return "Please enter your game name.";
  }

  if (!payload.steamUrl) {
    return "Please enter your Steam URL.";
  }

  if (!payload.estimatedBudget) {
    return "Please enter your estimated budget.";
  }

  if (!payload.biggestConcern) {
    return "Please enter the biggest concern you want checked.";
  }

  return null;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createAdminClient(supabaseUrl, serviceRoleKey);
}

function getLaunchMathAuditCheckoutUnavailableMessage() {
  return "Launch Math Audit checkout is not configured yet. Please email support@hollowmetric.com.";
}

export async function POST(request: Request) {
  const launchMathAuditPriceId = process.env.PADDLE_LAUNCH_MATH_AUDIT_PRICE_ID?.trim();

  if (!launchMathAuditPriceId) {
    return NextResponse.json(
      {
        error: getLaunchMathAuditCheckoutUnavailableMessage(),
      },
      { status: 503 },
    );
  }

  let requestBody: LaunchMathAuditCheckoutPayload;
  try {
    requestBody = (await request.json()) as LaunchMathAuditCheckoutPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const normalizedPayload = normalizePayload(requestBody);
  const validationError = validatePayload(normalizedPayload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin configuration is missing." }, { status: 500 });
  }

  const { data: insertedAuditRequest, error: insertError } = await supabase
    .from("launch_math_audit_requests")
    .insert({
      name: normalizedPayload.name,
      email: normalizedPayload.email,
      game_name: normalizedPayload.gameName,
      steam_url: normalizedPayload.steamUrl,
      release_window: normalizedPayload.releaseWindow,
      planned_price: normalizedPayload.plannedPrice,
      estimated_budget: normalizedPayload.estimatedBudget,
      biggest_concern: normalizedPayload.biggestConcern,
      referral_code: normalizedPayload.referralCode,
      status: "pending_payment",
    })
    .select("id")
    .single();

  if (insertError || !insertedAuditRequest) {
    return NextResponse.json(
      {
        error: "We couldn't create your audit request right now. Please try again.",
      },
      { status: 500 },
    );
  }

  const requestUrl = new URL(request.url);
  const successUrl = `${requestUrl.origin}/launch-math-audit?checkout=success`;

  return NextResponse.json(
    {
      priceId: launchMathAuditPriceId,
      email: normalizedPayload.email,
      successUrl,
      customData: {
        launch_math_audit_request_id: String(insertedAuditRequest.id),
      },
    },
    { status: 200 },
  );
}
