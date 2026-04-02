import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { getCreditsForPriceId } from "@/lib/credits";

export const runtime = "nodejs";

type PaddleWebhookPayload = {
  event_id?: string;
  event_type?: string;
  data?: Record<string, unknown>;
};

type PaddleLineItem = {
  price_id?: string;
  price?: {
    id?: string;
  };
};

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
}

function parsePaddleSignature(headerValue: string): { ts: string; h1: string } | null {
  const pairs = headerValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  const dictionary = new Map<string, string>();
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (!key || !value) continue;
    dictionary.set(key, value);
  }

  const ts = dictionary.get("ts");
  const h1 = dictionary.get("h1");
  if (!ts || !h1) {
    return null;
  }

  return { ts, h1 };
}

function verifyWebhookSignature(rawBody: string, signatureHeader: string, webhookSecret: string): boolean {
  const parsed = parsePaddleSignature(signatureHeader);
  if (!parsed) {
    return false;
  }

  const signedPayload = `${parsed.ts}:${rawBody}`;
  const expected = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(parsed.h1, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function extractUserId(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;

  const customData = data.custom_data as Record<string, unknown> | undefined;
  const userId = customData?.supabase_user_id;

  if (typeof userId === "string" && userId.trim()) {
    return userId.trim();
  }

  return null;
}

function extractPriceIds(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];

  const itemsValue = data.items as unknown;
  const detailsValue = data.details as { line_items?: unknown } | undefined;
  const detailItems = detailsValue?.line_items;

  const lineItems = Array.isArray(itemsValue)
    ? itemsValue
    : Array.isArray(detailItems)
      ? detailItems
      : [];

  if (!Array.isArray(lineItems)) {
    return [];
  }

  const items = lineItems as PaddleLineItem[];
  return items
    .map((item) => item.price_id ?? item.price?.id)
    .filter((priceId): priceId is string => typeof priceId === "string" && priceId.trim().length > 0)
    .map((priceId) => priceId.trim());
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return NextResponse.json({ error: "Missing PADDLE_WEBHOOK_SECRET" }, { status: 500 });
    }

    const signatureHeader = req.headers.get("Paddle-Signature");
    if (!signatureHeader) {
      return NextResponse.json({ error: "Missing Paddle-Signature header" }, { status: 400 });
    }

    const rawBody = await req.text();
    if (!verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as PaddleWebhookPayload;
    if (payload.event_type !== "transaction.completed") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const eventId = payload.event_id?.trim() || null;
    const data = payload.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Missing webhook data payload" }, { status: 400 });
    }

    const transactionId = typeof data.id === "string" ? data.id.trim() : "";
    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
    }

    const userId = extractUserId(data);
    if (!userId) {
      return NextResponse.json({ error: "Missing supabase_user_id in custom_data" }, { status: 400 });
    }

    const priceIds = extractPriceIds(data);
    if (priceIds.length === 0) {
      return NextResponse.json({ error: "No line-item price ids found" }, { status: 400 });
    }

    const creditsToGrant = priceIds.reduce((sum, priceId) => sum + getCreditsForPriceId(priceId), 0);
    if (creditsToGrant <= 0) {
      return NextResponse.json({ error: "No matching configured price ids found" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const { error: transactionInsertError } = await admin.from("credit_transactions").insert({
      user_id: userId,
      paddle_event_id: eventId,
      paddle_transaction_id: transactionId,
      price_ids: priceIds,
      credits_added: creditsToGrant,
    });

    if (transactionInsertError) {
      if (transactionInsertError.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }

      return NextResponse.json({ error: transactionInsertError.message }, { status: 500 });
    }

    const { data: creditRow, error: fetchBalanceError } = await admin
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle<{ balance: number }>();

    if (fetchBalanceError) {
      return NextResponse.json({ error: fetchBalanceError.message }, { status: 500 });
    }

    if (!creditRow) {
      const { error: insertBalanceError } = await admin.from("user_credits").insert({
        user_id: userId,
        balance: creditsToGrant,
      });

      if (insertBalanceError) {
        return NextResponse.json({ error: insertBalanceError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, creditsAdded: creditsToGrant, newBalance: creditsToGrant });
    }

    const updatedBalance = creditRow.balance + creditsToGrant;
    const { error: updateBalanceError } = await admin
      .from("user_credits")
      .update({ balance: updatedBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateBalanceError) {
      return NextResponse.json({ error: updateBalanceError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, creditsAdded: creditsToGrant, newBalance: updatedBalance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
