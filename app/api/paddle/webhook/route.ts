import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PaddleWebhookEvent = {
  event_id?: unknown;
  event_type?: unknown;
  occurred_at?: unknown;
  data?: unknown;
  [key: string]: unknown;
};

type BillingWebhookEventInsert = {
  paddle_event_id: string;
  event_type: string;
  event_created_at: string | null;
  received_at: string;
  processing_status: "pending" | "processed";
  payload: JsonValue;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type BillingSubscriptionUpsert = {
  user_id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string | null;
  paddle_status: string;
  status_normalized: string;
  plan_key: string;
  started_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  paused_at: string | null;
  trial_end_at: string | null;
  ended_at: string | null;
  raw_snapshot: JsonValue;
};

const SUBSCRIPTION_EVENT_TYPES = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
]);

type Database = {
  public: {
    Tables: {
      billing_price_map: {
        Row: {
          plan_key: string;
          paddle_price_id: string;
          is_active: boolean;
        };
        Insert: {
          plan_key: string;
          paddle_price_id: string;
          is_active: boolean;
        };
        Update: {
          plan_key?: string;
          paddle_price_id?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      billing_webhook_events: {
        Row: {
          id: number;
          paddle_event_id: string;
          event_type: string;
          event_created_at: string | null;
          received_at: string;
          processed_at: string | null;
          processing_status: string;
          error_message: string | null;
          payload: JsonValue;
        };
        Insert: {
          paddle_event_id: string;
          event_type: string;
          event_created_at: string | null;
          received_at: string;
          processing_status: "pending" | "processed";
          payload: JsonValue;
        };
        Update: {
          paddle_event_id?: string;
          event_type?: string;
          event_created_at?: string | null;
          received_at?: string;
          processed_at?: string | null;
          processing_status?: string;
          error_message?: string | null;
          payload?: JsonValue;
        };
        Relationships: [];
      };
      billing_subscriptions: {
        Row: {
          user_id: string;
          paddle_subscription_id: string;
          paddle_customer_id: string | null;
          paddle_status: string;
          status_normalized: string;
          plan_key: string;
          started_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean | null;
          canceled_at: string | null;
          paused_at: string | null;
          trial_end_at: string | null;
          ended_at: string | null;
          raw_snapshot: JsonValue;
          created_at: string;
          updated_at: string;
        };
        Insert: BillingSubscriptionUpsert;
        Update: Partial<BillingSubscriptionUpsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    return null;
  }

  return createAdminClient<Database>(url, serviceKey);
}

function parsePaddleSignatureHeader(headerValue: string) {
  const parts = headerValue
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  let timestamp = "";
  const hashes: string[] = [];

  for (const part of parts) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();

    if (!value) {
      continue;
    }

    if (key === "ts") {
      timestamp = value;
      continue;
    }

    if (key === "h1") {
      hashes.push(value.toLowerCase());
    }
  }

  return { timestamp, hashes };
}

function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string) {
  const { timestamp, hashes } = parsePaddleSignatureHeader(signatureHeader);

  if (!timestamp || hashes.length === 0) {
    return false;
  }

  const signedPayload = timestamp + ":" + rawBody;
  const expectedDigest = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex")
    .toLowerCase();

  const expectedBuffer = Buffer.from(expectedDigest, "hex");

  for (const candidate of hashes) {
    if (!/^[0-9a-f]{64}$/.test(candidate)) {
      continue;
    }

    const candidateBuffer = Buffer.from(candidate, "hex");

    if (candidateBuffer.length !== expectedBuffer.length) {
      continue;
    }

    if (timingSafeEqual(candidateBuffer, expectedBuffer)) {
      return true;
    }
  }

  return false;
}

function extractEventDetails(event: PaddleWebhookEvent) {
  const eventId = typeof event.event_id === "string" ? event.event_id.trim() : "";
  const eventType = typeof event.event_type === "string" ? event.event_type.trim() : "unknown";

  return { eventId, eventType };
}

function extractEventCreatedAt(event: PaddleWebhookEvent) {
  return readTimestamp(event.occurred_at);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readTimestamp(value: unknown): string | null {
  const text = readString(value);
  if (!text) {
    return null;
  }

  return Number.isNaN(Date.parse(text)) ? null : text;
}

function extractFirstSubscriptionItemPriceId(data: Record<string, unknown>) {
  const items = Array.isArray(data.items) ? data.items : [];
  const firstItem = asRecord(items[0]);
  const firstPrice = asRecord(firstItem?.price);

  return readString(firstPrice?.id);
}

async function resolveSubscriptionPlanKey(
  supabase: SupabaseClient<Database>,
  data: Record<string, unknown>,
  customData: Record<string, unknown> | null,
): Promise<{ ok: true; planKey: string } | { ok: false; reason: string }> {
  const directPlanKey = readString(data.plan_key) ?? readString(customData?.plan_key);
  if (directPlanKey) {
    return { ok: true, planKey: directPlanKey };
  }

  const paddlePriceId = extractFirstSubscriptionItemPriceId(data);
  if (!paddlePriceId) {
    return { ok: false, reason: "missing plan key and data.items[0].price.id" };
  }

  const { data: priceMapRow, error } = await supabase
    .from("billing_price_map")
    .select("plan_key")
    .eq("paddle_price_id", paddlePriceId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason: `billing_price_map lookup failed for price ${paddlePriceId}: ${error.message}`,
    };
  }

  const mappedPlanKey = readString(priceMapRow?.plan_key);
  if (!mappedPlanKey) {
    return { ok: false, reason: `no active billing_price_map mapping for price ${paddlePriceId}` };
  }

  return { ok: true, planKey: mappedPlanKey };
}

function normalizeSubscriptionStatus(rawStatus: string, eventType: string): string {
  const status = rawStatus.toLowerCase();

  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "paused") return "paused";
  if (status === "canceled" || status === "cancelled") return "canceled";
  if (status === "ended") return "ended";

  if (eventType === "subscription.canceled") {
    return "canceled";
  }

  return "unknown";
}

async function extractSubscriptionUpsert(
  supabase: SupabaseClient<Database>,
  event: PaddleWebhookEvent,
  eventType: string,
): Promise<{ ok: true; row: BillingSubscriptionUpsert } | { ok: false; reason: string }> {
  const data = asRecord(event.data);
  if (!data) {
    return { ok: false, reason: "missing subscription data object" };
  }

  const subscriptionId = readString(data.id);
  if (!subscriptionId) {
    return { ok: false, reason: "missing subscription id" };
  }

  const paddleStatus = readString(data.status);
  if (!paddleStatus) {
    return { ok: false, reason: "missing subscription status" };
  }

  const customer = asRecord(data.customer);
  const paddleCustomerId = readString(data.customer_id) ?? readString(customer?.id);

  const customData = asRecord(data.custom_data);
  const userId = readString(customData?.supabase_user_id);
  if (!userId) {
    return { ok: false, reason: "missing custom_data.supabase_user_id" };
  }

  const planKeyResult = await resolveSubscriptionPlanKey(supabase, data, customData);
  if (!planKeyResult.ok) {
    return planKeyResult;
  }

  const currentPeriod = asRecord(data.current_billing_period);
  const currentPeriodStart =
    readTimestamp(data.current_period_start) ?? readTimestamp(currentPeriod?.starts_at);
  const currentPeriodEnd =
    readTimestamp(data.current_period_end) ?? readTimestamp(currentPeriod?.ends_at);

  const cancelAtPeriodEnd =
    readBoolean(data.cancel_at_period_end) ??
    (asRecord(data.scheduled_change)?.action === "cancel" ? true : false);

  const row: BillingSubscriptionUpsert = {
    user_id: userId,
    paddle_subscription_id: subscriptionId,
    paddle_customer_id: paddleCustomerId,
    paddle_status: paddleStatus,
    status_normalized: normalizeSubscriptionStatus(paddleStatus, eventType),
    plan_key: planKeyResult.planKey,
    started_at: readTimestamp(data.started_at),
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    canceled_at: readTimestamp(data.canceled_at),
    paused_at: readTimestamp(data.paused_at),
    trial_end_at: readTimestamp(data.trial_end_at),
    ended_at: readTimestamp(data.ended_at),
    raw_snapshot: data as JsonValue,
  };

  return { ok: true, row };
}

async function insertVerifiedWebhookEvent(
  supabase: SupabaseClient<Database>,
  row: BillingWebhookEventInsert,
) {
  const { error } = await supabase
    .from("billing_webhook_events")
    .insert(row);

  if (!error) {
    return { ok: true as const, duplicate: false as const };
  }

  // Postgres unique_violation means this webhook event is a duplicate delivery.
  // Treat duplicates as idempotent success and preserve the original ledger row.
  if (error.code === "23505") {
    return { ok: true as const, duplicate: true as const };
  }

  return { ok: false as const, error };
}

async function upsertSubscription(
  supabase: SupabaseClient<Database>,
  row: BillingSubscriptionUpsert,
) {
  const { error } = await supabase
    .from("billing_subscriptions")
    .upsert(row, { onConflict: "paddle_subscription_id" });

  if (!error) {
    return { ok: true as const };
  }

  return { ok: false as const, error };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing PADDLE_WEBHOOK_SECRET." }, { status: 500 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase admin configuration." }, { status: 500 });
  }

  const signatureHeader = request.headers.get("Paddle-Signature")?.trim();
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing Paddle-Signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  const isValidSignature = verifyPaddleSignature(rawBody, signatureHeader, webhookSecret);
  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid Paddle signature." }, { status: 400 });
  }

  let parsedEvent: PaddleWebhookEvent;
  try {
    parsedEvent = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook JSON payload." }, { status: 400 });
  }

  const verifiedPayload = parsedEvent as JsonValue;

  const { eventId, eventType } = extractEventDetails(parsedEvent);

  if (!eventId) {
    return NextResponse.json({ error: "Missing event_id in Paddle payload." }, { status: 400 });
  }

  const persistResult = await insertVerifiedWebhookEvent(supabase, {
    paddle_event_id: eventId,
    event_type: eventType,
    event_created_at: extractEventCreatedAt(parsedEvent),
    received_at: new Date().toISOString(),
    processing_status: "pending",
    payload: verifiedPayload,
  });

  if (!persistResult.ok) {
    console.error("Failed to persist Paddle webhook event", {
      paddleEventId: eventId,
      eventType,
      code: persistResult.error.code,
      message: persistResult.error.message,
      details: persistResult.error.details,
      hint: persistResult.error.hint,
      error: persistResult.error,
    });
    return NextResponse.json({ error: "Failed to persist webhook event." }, { status: 500 });
  }

  if (persistResult.duplicate) {
    return NextResponse.json(
      {
        ok: true,
        paddleEventId: eventId,
        duplicate: true,
        subscriptionSynced: false,
        skipped: "duplicate_event_delivery",
      },
      { status: 200 },
    );
  }

  if (SUBSCRIPTION_EVENT_TYPES.has(eventType)) {
    const extracted = await extractSubscriptionUpsert(supabase, parsedEvent, eventType);

    if (!extracted.ok) {
      console.error("Malformed Paddle subscription event payload", {
        paddleEventId: eventId,
        eventType,
        reason: extracted.reason,
      });

      return NextResponse.json(
        {
          ok: true,
          paddleEventId: eventId,
          duplicate: persistResult.duplicate,
          subscriptionSynced: false,
          skipped: "malformed_subscription_payload",
        },
        { status: 200 },
      );
    }

    const subscriptionResult = await upsertSubscription(supabase, extracted.row);

    if (!subscriptionResult.ok) {
      console.error("Failed to upsert billing_subscriptions from Paddle webhook", {
        paddleEventId: eventId,
        eventType,
        paddleSubscriptionId: extracted.row.paddle_subscription_id,
        error: subscriptionResult.error,
      });

      return NextResponse.json(
        { error: "Failed to persist subscription state." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        paddleEventId: eventId,
        duplicate: persistResult.duplicate,
        subscriptionSynced: true,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      paddleEventId: eventId,
      duplicate: persistResult.duplicate,
      subscriptionSynced: false,
      skipped: "unrelated_event_type",
    },
    { status: 200 },
  );
}
