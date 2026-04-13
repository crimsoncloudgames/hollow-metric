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

type BillingCustomerSync = {
  user_id: string;
  paddle_customer_id: string;
  customer_email?: string | null;
  last_synced_at: string;
};

type UserEntitlementSync = {
  user_id: string;
  tier: "free" | "pro";
  premium_access: boolean;
  billing_state: "active" | "canceled" | "past_due";
  active_subscription_id: number | null;
  source: "webhook_sync";
  effective_from: string;
};

type CreditPurchaseFulfillment = {
  user_id: string;
  paddle_transaction_id: string;
  price_ids: string[];
  credits_added: number;
};

const SUBSCRIPTION_EVENT_TYPES = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.past_due",
  "subscription.updated",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
]);

const CREDIT_PACK_TRANSACTION_COMPLETED_EVENT_TYPE = "transaction.completed";
const PRO_UPGRADE_BONUS_CREDITS = 1;
const PRO_UPGRADE_BONUS_TRANSACTION_PREFIX = "bonus_pro_upgrade";

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
      billing_customers: {
        Row: {
          user_id: string;
          paddle_customer_id: string;
          customer_email: string | null;
          last_synced_at: string;
        };
        Insert: {
          user_id: string;
          paddle_customer_id: string;
          customer_email?: string | null;
          last_synced_at: string;
        };
        Update: {
          user_id?: string;
          paddle_customer_id?: string;
          customer_email?: string | null;
          last_synced_at?: string;
        };
        Relationships: [];
      };
      user_credits: {
        Row: {
          user_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          balance?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          id: number;
          user_id: string;
          paddle_event_id: string | null;
          paddle_transaction_id: string;
          price_ids: string[];
          credits_added: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          paddle_event_id?: string | null;
          paddle_transaction_id: string;
          price_ids?: string[];
          credits_added: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          paddle_event_id?: string | null;
          paddle_transaction_id?: string;
          price_ids?: string[];
          credits_added?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_entitlements: {
        Row: {
          user_id: string;
          tier: string;
          premium_access: boolean;
          billing_state: string;
          active_subscription_id: number | null;
          source: string;
          effective_from: string;
        };
        Insert: {
          user_id: string;
          tier: string;
          premium_access: boolean;
          billing_state: string;
          active_subscription_id: number | null;
          source: string;
          effective_from: string;
        };
        Update: {
          user_id?: string;
          tier?: string;
          premium_access?: boolean;
          billing_state?: string;
          active_subscription_id?: number | null;
          source?: string;
          effective_from?: string;
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
          id: number;
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
    Functions: {
      fulfill_paddle_credit_purchase: {
        Args: {
          target_user_id: string;
          paddle_event_id: string;
          paddle_transaction_id: string;
          price_ids: string[];
          credits_to_add: number;
        };
        Returns: JsonValue;
      };
    };
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

function extractTransactionItemPriceIds(data: Record<string, unknown>) {
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .map((item) => {
      const itemRecord = asRecord(item);
      const price = asRecord(itemRecord?.price);

      return readString(price?.id);
    })
    .filter((priceId): priceId is string => Boolean(priceId));
}

function resolveCreditPackCredits(priceIds: string[]) {
  const creditsByPriceId = new Map<string, number>();
  const configuredCreditPackPrices = [
    { priceId: process.env.PADDLE_CREDITS_1_PRICE_ID?.trim(), credits: 1 },
    { priceId: process.env.PADDLE_CREDITS_3_PRICE_ID?.trim(), credits: 3 },
    { priceId: process.env.PADDLE_CREDITS_6_PRICE_ID?.trim(), credits: 6 },
    { priceId: process.env.PADDLE_CREDITS_10_PRICE_ID?.trim(), credits: 10 },
  ];

  for (const configuredPrice of configuredCreditPackPrices) {
    if (!configuredPrice.priceId) {
      continue;
    }

    creditsByPriceId.set(configuredPrice.priceId, configuredPrice.credits);
  }

  if (priceIds.length === 0) {
    return { ok: false as const };
  }

  let creditsAdded = 0;

  for (const priceId of priceIds) {
    const credits = creditsByPriceId.get(priceId);

    if (!credits) {
      return { ok: false as const };
    }

    creditsAdded += credits;
  }

  return { ok: true as const, creditsAdded };
}

function buildProUpgradeBonusTransactionId(userId: string) {
  return `${PRO_UPGRADE_BONUS_TRANSACTION_PREFIX}:${userId}`;
}

function buildProUpgradeBonusCreditGrant(userId: string): CreditPurchaseFulfillment {
  return {
    user_id: userId,
    paddle_transaction_id: buildProUpgradeBonusTransactionId(userId),
    price_ids: [],
    credits_added: PRO_UPGRADE_BONUS_CREDITS,
  };
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

function isLiveSubscriptionConflict(error: {
  code?: string;
  message?: string;
  details?: string | null;
}) {
  return (
    error.code === "23505" &&
    (error.message?.includes("billing_subscriptions_one_live_per_user_idx") === true ||
      error.details?.includes("Key (user_id)=") === true)
  );
}

function isDeletedAuthUserReference(error: {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}) {
  const combinedMessage = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error.code === "23503" &&
    (
      combinedMessage.includes("auth.users") ||
      combinedMessage.includes("billing_subscriptions_user_id") ||
      combinedMessage.includes("billing_customers_user_id") ||
      combinedMessage.includes("user_entitlements_user_id") ||
      combinedMessage.includes("user_credits_user_id") ||
      combinedMessage.includes("credit_transactions_user_id")
    )
  );
}

async function markWebhookDeletedUserSkipped(
  supabase: SupabaseClient<Database>,
  paddleEventId: string,
  eventType: string,
  userId: string,
  duplicate: boolean,
) {
  console.info("Skipping Paddle webhook sync for deleted Supabase user", {
    paddleEventId,
    eventType,
    userId,
  });

  const processedAt = new Date().toISOString();
  const markProcessedResult = await markWebhookEventProcessed(supabase, paddleEventId, processedAt);

  if (!markProcessedResult.ok) {
    console.error("Failed to mark deleted-user Paddle webhook event as processed", {
      paddleEventId,
      eventType,
      userId,
      error: markProcessedResult.error,
    });

    return NextResponse.json(
      { error: "Failed to finalize webhook processing state." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      paddleEventId,
      duplicate,
      subscriptionSynced: false,
      skipped: "deleted_user",
    },
    { status: 200 },
  );
}

function extractTrustedCustomerEmail(event: PaddleWebhookEvent) {
  const data = asRecord(event.data);
  const customer = asRecord(data?.customer);

  return readString(customer?.email);
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

function extractCreditPurchaseFulfillment(
  event: PaddleWebhookEvent,
):
  | { ok: true; row: CreditPurchaseFulfillment }
  | { ok: false; reason: string; skip: boolean } {
  const data = asRecord(event.data);
  if (!data) {
    return { ok: false, reason: "missing transaction data object", skip: false };
  }

  const priceIds = extractTransactionItemPriceIds(data);
  if (priceIds.length === 0) {
    return { ok: false, reason: "missing transaction item price id", skip: false };
  }

  const resolvedCredits = resolveCreditPackCredits(priceIds);
  if (!resolvedCredits.ok) {
    return {
      ok: false,
      reason: "transaction does not contain a configured credit-pack price id",
      skip: true,
    };
  }

  const transactionId = readString(data.id);
  if (!transactionId) {
    return { ok: false, reason: "missing transaction id", skip: false };
  }

  const customData = asRecord(data.custom_data);
  const userId = readString(customData?.supabase_user_id);
  if (!userId) {
    return { ok: false, reason: "missing custom_data.supabase_user_id", skip: false };
  }

  return {
    ok: true,
    row: {
      user_id: userId,
      paddle_transaction_id: transactionId,
      price_ids: priceIds,
      credits_added: resolvedCredits.creditsAdded,
    },
  };
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
  const { data, error } = await supabase
    .from("billing_subscriptions")
    .upsert(row, { onConflict: "paddle_subscription_id" })
    .select("id")
    .single();

  if (!error) {
    return { ok: true as const, subscriptionId: data.id, liveConflict: false as const };
  }

  if (isLiveSubscriptionConflict(error)) {
    return {
      ok: true as const,
      subscriptionId: null,
      liveConflict: true as const,
      conflict: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    };
  }

  return { ok: false as const, error };
}

async function syncBillingCustomer(
  supabase: SupabaseClient<Database>,
  row: BillingCustomerSync,
) {
  const { data: existingRow, error: lookupError } = await supabase
    .from("billing_customers")
    .select("user_id")
    .eq("user_id", row.user_id)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return { ok: false as const, error: lookupError };
  }

  const syncRow: Database["public"]["Tables"]["billing_customers"]["Insert"] = {
    user_id: row.user_id,
    paddle_customer_id: row.paddle_customer_id,
    last_synced_at: row.last_synced_at,
    ...(row.customer_email !== undefined ? { customer_email: row.customer_email } : {}),
  };

  if (existingRow) {
    const { error } = await supabase
      .from("billing_customers")
      .update(syncRow)
      .eq("user_id", row.user_id);

    if (error) {
      return { ok: false as const, error };
    }

    return { ok: true as const };
  }

  const { error } = await supabase
    .from("billing_customers")
    .insert(syncRow);

  if (error) {
    return { ok: false as const, error };
  }

  return { ok: true as const };
}

async function syncUserEntitlement(
  supabase: SupabaseClient<Database>,
  row: UserEntitlementSync,
) {
  const { data: existingRow, error: lookupError } = await supabase
    .from("user_entitlements")
    .select("user_id")
    .eq("user_id", row.user_id)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return { ok: false as const, error: lookupError };
  }

  if (existingRow) {
    const { error } = await supabase
      .from("user_entitlements")
      .update(row)
      .eq("user_id", row.user_id);

    if (error) {
      return { ok: false as const, error };
    }

    return { ok: true as const };
  }

  const { error } = await supabase
    .from("user_entitlements")
    .insert(row);

  if (error) {
    return { ok: false as const, error };
  }

  return { ok: true as const };
}

async function fulfillCreditPurchase(
  supabase: SupabaseClient<Database>,
  paddleEventId: string,
  row: CreditPurchaseFulfillment,
) {
  const { data, error } = await supabase.rpc("fulfill_paddle_credit_purchase", {
    target_user_id: row.user_id,
    paddle_event_id: paddleEventId,
    paddle_transaction_id: row.paddle_transaction_id,
    price_ids: row.price_ids,
    credits_to_add: row.credits_added,
  });

  if (error) {
    return { ok: false as const, error };
  }

  const result = asRecord(data);

  return {
    ok: true as const,
    duplicate: readBoolean(result?.duplicate) ?? false,
  };
}

async function markWebhookEventProcessed(
  supabase: SupabaseClient<Database>,
  paddleEventId: string,
  processedAt: string,
) {
  const { error } = await supabase
    .from("billing_webhook_events")
    .update({
      processing_status: "processed",
      processed_at: processedAt,
    })
    .eq("paddle_event_id", paddleEventId);

  if (error) {
    return { ok: false as const, error };
  }

  return { ok: true as const };
}

async function recordWebhookError(
  supabase: SupabaseClient<Database>,
  paddleEventId: string,
  errorMessage: string,
) {
  const { error } = await supabase
    .from("billing_webhook_events")
    .update({ error_message: errorMessage })
    .eq("paddle_event_id", paddleEventId);

  if (error) {
    console.error("Failed to persist Paddle webhook error message", {
      paddleEventId,
      errorMessage,
      error,
    });
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET?.trim();
  const simulationWebhookSecret = process.env.PADDLE_SIMULATION_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error("Paddle webhook rejected: missing PADDLE_WEBHOOK_SECRET environment variable.");
    return NextResponse.json({ error: "Missing PADDLE_WEBHOOK_SECRET." }, { status: 500 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("Paddle webhook rejected: missing Supabase admin configuration.");
    return NextResponse.json({ error: "Missing Supabase admin configuration." }, { status: 500 });
  }

  const signatureHeader = request.headers.get("Paddle-Signature")?.trim();
  if (!signatureHeader) {
    console.error("Paddle webhook rejected: missing Paddle-Signature header.");
    return NextResponse.json({ error: "Missing Paddle-Signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  console.info("Paddle webhook received", {
    contentType: request.headers.get("content-type")?.trim() ?? null,
    signatureHeaderPresent: Boolean(signatureHeader),
    rawBody,
  });

  const isValidSignature =
    verifyPaddleSignature(rawBody, signatureHeader, webhookSecret) ||
    (simulationWebhookSecret
      ? verifyPaddleSignature(rawBody, signatureHeader, simulationWebhookSecret)
      : false);
  if (!isValidSignature) {
    console.error("Paddle webhook rejected: invalid Paddle signature.", {
      bodyLength: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid Paddle signature." }, { status: 400 });
  }

  let parsedEvent: PaddleWebhookEvent;
  try {
    parsedEvent = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch {
    console.error("Paddle webhook rejected: invalid JSON payload.", {
      bodyLength: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid webhook JSON payload." }, { status: 400 });
  }

  const verifiedPayload = parsedEvent as JsonValue;

  const { eventId, eventType } = extractEventDetails(parsedEvent);

  if (!eventId) {
    console.error("Paddle webhook rejected: missing event_id in payload.", {
      eventType,
    });
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

  if (eventType === CREDIT_PACK_TRANSACTION_COMPLETED_EVENT_TYPE) {
    const extracted = extractCreditPurchaseFulfillment(parsedEvent);

    if (!extracted.ok) {
      const processedAt = new Date().toISOString();

      if (extracted.skip) {
        const markProcessedResult = await markWebhookEventProcessed(supabase, eventId, processedAt);

        if (!markProcessedResult.ok) {
          console.error("Failed to mark unmatched Paddle transaction webhook event as processed", {
            paddleEventId: eventId,
            eventType,
            error: markProcessedResult.error,
          });

          return NextResponse.json(
            { error: "Failed to finalize webhook processing state." },
            { status: 500 },
          );
        }

        return NextResponse.json(
          {
            ok: true,
            paddleEventId: eventId,
            duplicate: persistResult.duplicate,
            creditPurchaseFulfilled: false,
            skipped: "unmatched_credit_pack_price_id",
          },
          { status: 200 },
        );
      }

      console.error("Malformed Paddle completed transaction payload", {
        paddleEventId: eventId,
        eventType,
        reason: extracted.reason,
      });

      await recordWebhookError(supabase, eventId, extracted.reason);

      const markProcessedResult = await markWebhookEventProcessed(supabase, eventId, processedAt);

      if (!markProcessedResult.ok) {
        console.error("Failed to mark malformed Paddle transaction webhook event as processed", {
          paddleEventId: eventId,
          eventType,
          error: markProcessedResult.error,
        });

        return NextResponse.json(
          { error: "Failed to finalize webhook processing state." },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          paddleEventId: eventId,
          duplicate: persistResult.duplicate,
          creditPurchaseFulfilled: false,
          skipped: "malformed_credit_transaction_payload",
        },
        { status: 200 },
      );
    }

    const fulfillmentResult = await fulfillCreditPurchase(supabase, eventId, extracted.row);

    if (!fulfillmentResult.ok) {
      const errorMessage = [
        "Failed to fulfill credit purchase.",
        fulfillmentResult.error.message,
        fulfillmentResult.error.details,
        fulfillmentResult.error.hint,
      ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(" ");

      console.error("Failed to fulfill Paddle credit purchase", {
        paddleEventId: eventId,
        eventType,
        paddleTransactionId: extracted.row.paddle_transaction_id,
        userId: extracted.row.user_id,
        error: fulfillmentResult.error,
      });

      await recordWebhookError(supabase, eventId, errorMessage);

      return NextResponse.json(
        { error: "Failed to fulfill credit purchase." },
        { status: 500 },
      );
    }

    const processedAt = new Date().toISOString();
    const markProcessedResult = await markWebhookEventProcessed(supabase, eventId, processedAt);

    if (!markProcessedResult.ok) {
      const errorMessage = [
        "Failed to finalize webhook processing state.",
        markProcessedResult.error.message,
        markProcessedResult.error.details,
        markProcessedResult.error.hint,
      ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(" ");

      console.error("Failed to mark Paddle credit purchase webhook event as processed", {
        paddleEventId: eventId,
        eventType,
        error: markProcessedResult.error,
      });

      await recordWebhookError(supabase, eventId, errorMessage);

      return NextResponse.json(
        { error: "Failed to finalize webhook processing state." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        paddleEventId: eventId,
        duplicate: persistResult.duplicate,
        creditPurchaseFulfilled: !fulfillmentResult.duplicate,
        skipped: fulfillmentResult.duplicate ? "duplicate_credit_transaction" : undefined,
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

      await recordWebhookError(supabase, eventId, extracted.reason);
      const malformedProcessedAt = new Date().toISOString();
      const markProcessedResult = await markWebhookEventProcessed(
        supabase,
        eventId,
        malformedProcessedAt,
      );

      if (!markProcessedResult.ok) {
        console.error("Failed to mark malformed Paddle webhook event as processed", {
          paddleEventId: eventId,
          eventType,
          error: markProcessedResult.error,
        });

        return NextResponse.json(
          { error: "Failed to finalize webhook processing state." },
          { status: 500 },
        );
      }

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
      if (isDeletedAuthUserReference(subscriptionResult.error)) {
        return markWebhookDeletedUserSkipped(
          supabase,
          eventId,
          eventType,
          extracted.row.user_id,
          persistResult.duplicate,
        );
      }

      const errorMessage = [
        "Failed to persist subscription state.",
        subscriptionResult.error.message,
        subscriptionResult.error.details,
        subscriptionResult.error.hint,
      ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(" ");

      console.error("Failed to upsert billing_subscriptions from Paddle webhook", {
        paddleEventId: eventId,
        eventType,
        paddleSubscriptionId: extracted.row.paddle_subscription_id,
        error: subscriptionResult.error,
      });

      await recordWebhookError(supabase, eventId, errorMessage);

      return NextResponse.json(
        { error: "Failed to persist subscription state." },
        { status: 500 },
      );
    }

    if (subscriptionResult.liveConflict) {
      console.warn("Conflicting live subscription already exists for user; skipping downstream sync", {
        paddleEventId: eventId,
        eventType,
        userId: extracted.row.user_id,
        paddleSubscriptionId: extracted.row.paddle_subscription_id,
        conflict: subscriptionResult.conflict,
      });

      const processedAt = new Date().toISOString();
      const markProcessedResult = await markWebhookEventProcessed(supabase, eventId, processedAt);

      if (!markProcessedResult.ok) {
        console.error("Failed to mark conflicting Paddle webhook event as processed", {
          paddleEventId: eventId,
          eventType,
          error: markProcessedResult.error,
        });

        return NextResponse.json(
          { error: "Failed to finalize webhook processing state." },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          paddleEventId: eventId,
          duplicate: persistResult.duplicate,
          subscriptionSynced: false,
          skipped: "conflicting_live_subscription",
        },
        { status: 200 },
      );
    }

    if (!extracted.row.paddle_customer_id) {
      const errorMessage = "Failed to sync billing customer state. Missing paddle customer id in webhook payload.";

      console.error("Missing paddle customer id for billing_customers sync", {
        paddleEventId: eventId,
        eventType,
        paddleSubscriptionId: extracted.row.paddle_subscription_id,
      });

      await recordWebhookError(supabase, eventId, errorMessage);

      return NextResponse.json(
        { error: "Failed to sync billing customer state." },
        { status: 500 },
      );
    }

    const syncTimestamp = new Date().toISOString();
    const billingCustomerResult = await syncBillingCustomer(supabase, {
      user_id: extracted.row.user_id,
      paddle_customer_id: extracted.row.paddle_customer_id,
      customer_email: extractTrustedCustomerEmail(parsedEvent) ?? undefined,
      last_synced_at: syncTimestamp,
    });

    if (!billingCustomerResult.ok) {
      if (isDeletedAuthUserReference(billingCustomerResult.error)) {
        return markWebhookDeletedUserSkipped(
          supabase,
          eventId,
          eventType,
          extracted.row.user_id,
          persistResult.duplicate,
        );
      }

      const errorMessage = [
        "Failed to sync billing customer state.",
        billingCustomerResult.error.message,
        billingCustomerResult.error.details,
        billingCustomerResult.error.hint,
      ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(" ");

      console.error("Failed to sync billing_customers from Paddle webhook", {
        paddleEventId: eventId,
        eventType,
        paddleSubscriptionId: extracted.row.paddle_subscription_id,
        paddleCustomerId: extracted.row.paddle_customer_id,
        error: billingCustomerResult.error,
      });

      await recordWebhookError(supabase, eventId, errorMessage);

      return NextResponse.json(
        { error: "Failed to sync billing customer state." },
        { status: 500 },
      );
    }

    let entitlementRow: UserEntitlementSync | null = null;

    if (extracted.row.plan_key === "pro" && extracted.row.status_normalized === "active") {
      entitlementRow = {
        user_id: extracted.row.user_id,
        tier: "pro",
        premium_access: true,
        billing_state: "active",
        active_subscription_id: subscriptionResult.subscriptionId,
        source: "webhook_sync",
        effective_from: syncTimestamp,
      };
    } else if (extracted.row.plan_key === "pro" && extracted.row.status_normalized === "past_due") {
      entitlementRow = {
        user_id: extracted.row.user_id,
        tier: "pro",
        premium_access: false,
        billing_state: "past_due",
        active_subscription_id: subscriptionResult.subscriptionId,
        source: "webhook_sync",
        effective_from: syncTimestamp,
      };
    } else if (extracted.row.plan_key === "pro" && extracted.row.status_normalized === "canceled") {
      entitlementRow = {
        user_id: extracted.row.user_id,
        tier: "free",
        premium_access: false,
        billing_state: "canceled",
        active_subscription_id: null,
        source: "webhook_sync",
        effective_from: syncTimestamp,
      };
    }

    if (!entitlementRow) {
      const errorMessage = `Failed to sync user entitlement state. Unsupported plan/status combination: ${extracted.row.plan_key}/${extracted.row.status_normalized}.`;

      console.error("Unsupported subscription state for user_entitlements sync", {
        paddleEventId: eventId,
        eventType,
        paddleSubscriptionId: extracted.row.paddle_subscription_id,
        planKey: extracted.row.plan_key,
        statusNormalized: extracted.row.status_normalized,
      });

      await recordWebhookError(supabase, eventId, errorMessage);

      return NextResponse.json(
        { error: "Failed to sync user entitlement state." },
        { status: 500 },
      );
    }

    const entitlementResult = await syncUserEntitlement(supabase, entitlementRow);

    if (!entitlementResult.ok) {
      if (isDeletedAuthUserReference(entitlementResult.error)) {
        return markWebhookDeletedUserSkipped(
          supabase,
          eventId,
          eventType,
          extracted.row.user_id,
          persistResult.duplicate,
        );
      }

      const errorMessage = [
        "Failed to sync user entitlement state.",
        entitlementResult.error.message,
        entitlementResult.error.details,
        entitlementResult.error.hint,
      ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(" ");

      console.error("Failed to sync user_entitlements from Paddle webhook", {
        paddleEventId: eventId,
        eventType,
        paddleSubscriptionId: extracted.row.paddle_subscription_id,
        userId: extracted.row.user_id,
        error: entitlementResult.error,
      });

      await recordWebhookError(supabase, eventId, errorMessage);

      return NextResponse.json(
        { error: "Failed to sync user entitlement state." },
        { status: 500 },
      );
    }

    let bonusCreditResult: Awaited<ReturnType<typeof fulfillCreditPurchase>> | null = null;

    if (extracted.row.plan_key === "pro" && extracted.row.status_normalized === "active") {
      bonusCreditResult = await fulfillCreditPurchase(
        supabase,
        eventId,
        buildProUpgradeBonusCreditGrant(extracted.row.user_id),
      );

      if (!bonusCreditResult.ok) {
        if (isDeletedAuthUserReference(bonusCreditResult.error)) {
          return markWebhookDeletedUserSkipped(
            supabase,
            eventId,
            eventType,
            extracted.row.user_id,
            persistResult.duplicate,
          );
        }

        const errorMessage = [
          "Failed to grant pro upgrade bonus credit.",
          bonusCreditResult.error.message,
          bonusCreditResult.error.details,
          bonusCreditResult.error.hint,
        ]
          .filter((value): value is string => Boolean(value && value.trim()))
          .join(" ");

        console.error("Failed to grant pro upgrade bonus credit", {
          paddleEventId: eventId,
          eventType,
          paddleSubscriptionId: extracted.row.paddle_subscription_id,
          userId: extracted.row.user_id,
          error: bonusCreditResult.error,
        });

        await recordWebhookError(supabase, eventId, errorMessage);

        return NextResponse.json(
          { error: "Failed to grant pro upgrade bonus credit." },
          { status: 500 },
        );
      }
    }

    const markProcessedResult = await markWebhookEventProcessed(supabase, eventId, syncTimestamp);

    if (!markProcessedResult.ok) {
      const errorMessage = [
        "Failed to finalize webhook processing state.",
        markProcessedResult.error.message,
        markProcessedResult.error.details,
        markProcessedResult.error.hint,
      ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(" ");

      console.error("Failed to mark Paddle webhook event as processed", {
        paddleEventId: eventId,
        eventType,
        error: markProcessedResult.error,
      });

      await recordWebhookError(supabase, eventId, errorMessage);

      return NextResponse.json(
        { error: "Failed to finalize webhook processing state." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        paddleEventId: eventId,
        duplicate: persistResult.duplicate,
        subscriptionSynced: true,
        bonusCreditGranted: bonusCreditResult ? !bonusCreditResult.duplicate : false,
      },
      { status: 200 },
    );
  }

  const unrelatedProcessedAt = new Date().toISOString();
  const markProcessedResult = await markWebhookEventProcessed(
    supabase,
    eventId,
    unrelatedProcessedAt,
  );

  if (!markProcessedResult.ok) {
    console.error("Failed to mark unrelated Paddle webhook event as processed", {
      paddleEventId: eventId,
      eventType,
      error: markProcessedResult.error,
    });

    return NextResponse.json(
      { error: "Failed to finalize webhook processing state." },
      { status: 500 },
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
