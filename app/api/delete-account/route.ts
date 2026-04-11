import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type DeleteAccountRequestBody = {
  confirm?: boolean;
};

type SupabaseErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

type CleanupTarget = {
  table: string;
  column: string;
};

const CLEANUP_TARGETS: CleanupTarget[] = [
  { table: "reports", column: "user_id" },
  { table: "billing_customers", column: "user_id" },
  { table: "user_entitlements", column: "user_id" },
  { table: "billing_subscriptions", column: "user_id" },
  { table: "credit_transactions", column: "user_id" },
  { table: "user_credits", column: "user_id" },
  { table: "financial_projects", column: "user_id" },
  { table: "profiles", column: "id" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatSupabaseError(error: SupabaseErrorLike | null | undefined, fallback: string): string {
  if (!error) {
    return fallback;
  }

  return [error.message, error.details, error.hint, error.code]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(" | ") || fallback;
}

function isIgnorableCleanupError(error: SupabaseErrorLike | null | undefined): boolean {
  const message = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

function getSupabaseAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getPaddleEnvironment() {
  const normalizedEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENV?.trim().toLowerCase();

  return normalizedEnvironment === "production" || normalizedEnvironment === "live"
    ? "production"
    : "sandbox";
}

function getPaddleApiKey() {
  if (getPaddleEnvironment() === "production") {
    return process.env.PADDLE_API_KEY_LIVE?.trim() ?? process.env.PADDLE_API_KEY?.trim() ?? "";
  }

  return process.env.PADDLE_API_KEY_SANDBOX?.trim() ?? process.env.PADDLE_API_KEY?.trim() ?? "";
}

function getMissingPaddleApiKeyMessage() {
  return "We couldn't cancel your active subscription automatically right now. Please contact support before deleting your account.";
}

function formatPaddleApiError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const topLevelError = isRecord(payload.error) ? payload.error : null;
  const messages = [
    readString(topLevelError?.detail),
    readString(topLevelError?.message),
    readString(topLevelError?.code),
    readString(payload.error),
  ].filter((value): value is string => Boolean(value));

  if (Array.isArray(payload.errors)) {
    for (const errorEntry of payload.errors) {
      if (!isRecord(errorEntry)) {
        continue;
      }

      const message =
        readString(errorEntry.detail) ??
        readString(errorEntry.message) ??
        readString(errorEntry.code);

      if (message) {
        messages.push(message);
      }
    }
  }

  return messages.join(" ") || fallback;
}

function extractPaddleSubscriptionId(row: unknown): string | null {
  if (!isRecord(row)) {
    return null;
  }

  return readString(row.paddle_subscription_id);
}

function isCanceledSubscriptionStatus(status: string | null): boolean {
  if (!status) {
    return false;
  }

  const normalizedStatus = status.trim().toLowerCase();
  return (
    normalizedStatus === "canceled" ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "ended" ||
    normalizedStatus === "expired"
  );
}

function isActiveSubscriptionRow(row: unknown): boolean {
  if (!isRecord(row)) {
    return false;
  }

  if (!extractPaddleSubscriptionId(row)) {
    return false;
  }

  const statusCandidates = [
    readString(row.status_normalized),
    readString(row.paddle_status),
    readString(row.status),
  ];

  if (statusCandidates.some((status) => isCanceledSubscriptionStatus(status))) {
    return false;
  }

  return !readString(row.canceled_at) && !readString(row.ended_at);
}

async function deleteUserOwnedRows(
  supabase: SupabaseClient,
  target: CleanupTarget,
  userId: string,
) {
  const { error } = await supabase
    .from(target.table)
    .delete()
    .eq(target.column, userId);

  if (!error || isIgnorableCleanupError(error)) {
    if (error) {
      console.warn("Skipping optional delete-account cleanup target", {
        table: target.table,
        column: target.column,
        userId,
        error,
      });
    }

    return;
  }

  throw new Error(`Failed to delete ${target.table}: ${formatSupabaseError(error, "Unknown database error.")}`);
}

async function getActivePaddleSubscriptionIds(supabase: SupabaseClient, userId: string) {
  const subscriptionIds = new Set<string>();

  const { data: entitlementRow, error: entitlementError } = await supabase
    .from("user_entitlements")
    .select("active_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (entitlementError && !isIgnorableCleanupError(entitlementError)) {
    throw new Error(
      `Failed to load user entitlement state: ${formatSupabaseError(entitlementError, "Unknown database error.")}`
    );
  }

  const activeSubscriptionId =
    isRecord(entitlementRow) && typeof entitlementRow.active_subscription_id === "number"
      ? entitlementRow.active_subscription_id
      : null;

  if (activeSubscriptionId !== null) {
    const { data: activeSubscriptionRow, error: activeSubscriptionError } = await supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("id", activeSubscriptionId)
      .maybeSingle();

    if (activeSubscriptionError && !isIgnorableCleanupError(activeSubscriptionError)) {
      throw new Error(
        `Failed to load active subscription state: ${formatSupabaseError(activeSubscriptionError, "Unknown database error.")}`
      );
    }

    const paddleSubscriptionId = extractPaddleSubscriptionId(activeSubscriptionRow);
    if (paddleSubscriptionId) {
      subscriptionIds.add(paddleSubscriptionId);
    }
  }

  if (subscriptionIds.size > 0) {
    return [...subscriptionIds];
  }

  const { data: subscriptionRows, error: subscriptionRowsError } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (subscriptionRowsError) {
    if (isIgnorableCleanupError(subscriptionRowsError)) {
      return [];
    }

    throw new Error(
      `Failed to load billing subscriptions: ${formatSupabaseError(subscriptionRowsError, "Unknown database error.")}`
    );
  }

  for (const row of Array.isArray(subscriptionRows) ? subscriptionRows : []) {
    if (!isActiveSubscriptionRow(row)) {
      continue;
    }

    const paddleSubscriptionId = extractPaddleSubscriptionId(row);
    if (paddleSubscriptionId) {
      subscriptionIds.add(paddleSubscriptionId);
    }
  }

  return [...subscriptionIds];
}

async function getStoredPaddleCustomerId(supabase: SupabaseClient, userId: string) {
  const { data: billingCustomerRow, error: billingCustomerError } = await supabase
    .from("billing_customers")
    .select("paddle_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (billingCustomerError) {
    if (isIgnorableCleanupError(billingCustomerError)) {
      return null;
    }

    throw new Error(
      `Failed to load stored Paddle customer linkage: ${formatSupabaseError(billingCustomerError, "Unknown database error.")}`
    );
  }

  return isRecord(billingCustomerRow)
    ? readString(billingCustomerRow.paddle_customer_id)
    : null;
}

async function listActivePaddleSubscriptionIdsForCustomer(apiKey: string, paddleCustomerId: string) {
  const query = new URLSearchParams({
    customer_id: paddleCustomerId,
    per_page: "200",
  });

  const response = await fetch(`https://api.paddle.com/subscriptions?${query.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      formatPaddleApiError(
        payload,
        `Paddle refused the subscription lookup for customer ${paddleCustomerId}.`
      )
    );
  }

  const subscriptionIds = new Set<string>();
  const subscriptionRows = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];

  for (const row of subscriptionRows) {
    if (!isRecord(row)) {
      continue;
    }

    const subscriptionId = readString(row.id);
    const status = readString(row.status);

    if (!subscriptionId) {
      continue;
    }

    if (isCanceledSubscriptionStatus(status)) {
      continue;
    }

    if (readString(row.canceled_at) || readString(row.ended_at)) {
      continue;
    }

    subscriptionIds.add(subscriptionId);
  }

  return [...subscriptionIds];
}

async function fetchPaddleSubscription(apiKey: string, subscriptionId: string) {
  const response = await fetch(`https://api.paddle.com/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      formatPaddleApiError(
        payload,
        `Paddle refused the subscription lookup for ${subscriptionId}.`
      )
    );
  }

  return payload;
}

async function cancelPaddleSubscription(apiKey: string, subscriptionId: string) {
  const currentSubscriptionPayload = await fetchPaddleSubscription(apiKey, subscriptionId);
  const currentSubscription = isRecord(currentSubscriptionPayload)
    ? (isRecord(currentSubscriptionPayload.data) ? currentSubscriptionPayload.data : null)
    : null;
  const currentStatus = readString(currentSubscription?.status);

  if (isCanceledSubscriptionStatus(currentStatus)) {
    return;
  }

  const response = await fetch(`https://api.paddle.com/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ effective_from: "immediately" }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      formatPaddleApiError(
        payload,
        `Paddle failed to cancel the active subscription ${subscriptionId}.`
      )
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as DeleteAccountRequestBody | null;

    if (body?.confirm !== true) {
      return NextResponse.json(
        { error: "Account deletion requires explicit confirmation." },
        { status: 400 }
      );
    }

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

    const supabaseAdmin = getSupabaseAdminClient();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Missing Supabase admin configuration." },
        { status: 500 }
      );
    }

    let activePaddleSubscriptionIds = await getActivePaddleSubscriptionIds(supabaseAdmin, user.id);
    let paddleApiKey = "";

    if (activePaddleSubscriptionIds.length === 0) {
      const storedPaddleCustomerId = await getStoredPaddleCustomerId(supabaseAdmin, user.id);

      if (storedPaddleCustomerId) {
        paddleApiKey = getPaddleApiKey();

        if (!paddleApiKey) {
          console.error("Delete account blocked: missing Paddle API key for fallback subscription lookup.", {
            userId: user.id,
            environment: getPaddleEnvironment(),
            storedPaddleCustomerId,
          });

          return NextResponse.json(
            { error: getMissingPaddleApiKeyMessage() },
            { status: 503 }
          );
        }

        activePaddleSubscriptionIds = await listActivePaddleSubscriptionIdsForCustomer(
          paddleApiKey,
          storedPaddleCustomerId,
        );
      }
    }

    if (activePaddleSubscriptionIds.length > 0) {
      if (!paddleApiKey) {
        paddleApiKey = getPaddleApiKey();
      }

      if (!paddleApiKey) {
        console.error("Delete account blocked: missing Paddle API key for active subscription cancellation.", {
          userId: user.id,
          environment: getPaddleEnvironment(),
          activePaddleSubscriptionIds,
        });

        return NextResponse.json(
          { error: getMissingPaddleApiKeyMessage() },
          { status: 503 }
        );
      }

      for (const subscriptionId of activePaddleSubscriptionIds) {
        await cancelPaddleSubscription(paddleApiKey, subscriptionId);
      }
    }

    for (const cleanupTarget of CLEANUP_TARGETS) {
      await deleteUserOwnedRows(supabaseAdmin, cleanupTarget, user.id);
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error("Failed to delete Supabase auth user", {
        userId: user.id,
        error: deleteUserError,
      });

      return NextResponse.json(
        {
          error: formatSupabaseError(
            deleteUserError,
            "We couldn't delete your account right now."
          ),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account request failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "We couldn't delete your account right now.",
      },
      { status: 500 }
    );
  }
}