import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAccessTokenFromAuthorizationHeader,
  STEAM_TAG_TOOL_CREDIT_COST,
  STEAM_TAG_TOOL_CREDIT_REQUIRED_MESSAGE,
} from "@/lib/credits";
import { normalizeCreditsBalance } from "@/lib/credits-ui";
import { requireVerifiedUser } from "@/lib/verified-user";
import { createClient as createSupabaseServerClient, hasSupabaseServerEnv } from "@/utils/supabase/server";

export const runtime = "nodejs";

type JsonErrorCode =
  | "supabase_config_error"
  | "unauthenticated"
  | "unverified_email"
  | "credits_lookup_failed"
  | "credits_row_not_found"
  | "insufficient_credits"
  | "balance_update_failed"
  | "transaction_insert_failed"
  | "unexpected_error";

function logDeductCheckpoint(checkpoint: string, payload: Record<string, unknown>) {
  console.info("Steam Tag Tool deduct route", {
    source: "steam-tag-tool/steam-page/deduct",
    checkpoint,
    ...payload,
  });
}

function logDeductThrownError(error: unknown) {
  if (error instanceof Error) {
    console.error("Steam Tag Tool deduct route error", {
      source: "steam-tag-tool/steam-page/deduct",
      message: error.message,
      stack: error.stack ?? null,
    });

    return;
  }

  console.error("Steam Tag Tool deduct route error", {
    source: "steam-tag-tool/steam-page/deduct",
    message: String(error),
    stack: null,
  });
}

function jsonError(message: string, status: number, code: JsonErrorCode, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

async function createDeductRouteClient(accessToken?: string | null) {
  const cookieStore = await cookies();
  const authorizationHeader = accessToken ? `Bearer ${accessToken}` : null;

  return createSupabaseServerClient(
    cookieStore,
    authorizationHeader
      ? {
          global: {
            headers: {
              Authorization: authorizationHeader,
            },
          },
        }
      : undefined
  );
}

// Legacy endpoint kept for backwards compatibility while older clients roll off.
// The active Steam Page flow now deducts credits inside the main analysis request
// before any successful result is returned.
export async function POST(request: NextRequest) {
  const accessToken = getSupabaseAccessTokenFromAuthorizationHeader(request.headers.get("authorization"));

  try {
    if (!hasSupabaseServerEnv) {
      logDeductCheckpoint("supabase-config", {
        hasSupabaseServerEnv,
      });

      return jsonError("Supabase configuration error.", 500, "supabase_config_error");
    }

    const supabase = await createDeductRouteClient(accessToken);

    if (!supabase) {
      logDeductCheckpoint("supabase-client", {
        clientCreated: false,
      });

      return jsonError("Supabase configuration error.", 500, "supabase_config_error");
    }

    const authResult = await requireVerifiedUser(supabase, accessToken);

    logDeductCheckpoint("auth", {
      authenticated: authResult.ok,
      userId: authResult.ok ? authResult.user.id : null,
      authError: authResult.ok ? null : authResult.authErrorMessage ?? authResult.error,
      status: authResult.ok ? 200 : authResult.status,
    });

    if (!authResult.ok) {
      return jsonError(
        authResult.error,
        authResult.status,
        authResult.status === 401 ? "unauthenticated" : "unverified_email"
      );
    }

    const userId = authResult.user.id;
    const creditsLookupResult = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    const currentBalance = normalizeCreditsBalance(creditsLookupResult.data?.balance);

    logDeductCheckpoint("credits-lookup", {
      userId,
      hasCreditsRow: Boolean(creditsLookupResult.data),
      currentBalance,
      creditsLookupError: creditsLookupResult.error?.message ?? null,
    });

    if (creditsLookupResult.error) {
      return jsonError(
        "We couldn't verify your credits right now. Please try again.",
        500,
        "credits_lookup_failed",
        {
          userId,
        }
      );
    }

    if (!creditsLookupResult.data) {
      return jsonError("No credits row found for the authenticated user.", 404, "credits_row_not_found", {
        userId,
      });
    }

    if (currentBalance < STEAM_TAG_TOOL_CREDIT_COST) {
      return jsonError(STEAM_TAG_TOOL_CREDIT_REQUIRED_MESSAGE, 403, "insufficient_credits", {
        userId,
        currentBalance,
      });
    }

    const nextBalance = Math.max(0, currentBalance - STEAM_TAG_TOOL_CREDIT_COST);
    const balanceUpdateResult = await supabase
      .from("user_credits")
      .update({
        balance: nextBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .gte("balance", STEAM_TAG_TOOL_CREDIT_COST)
      .select("balance")
      .maybeSingle();

    logDeductCheckpoint("balance-update", {
      userId,
      attemptedNextBalance: nextBalance,
      updateReturnedRow: Boolean(balanceUpdateResult.data),
      updatedBalance: normalizeCreditsBalance(balanceUpdateResult.data?.balance),
      balanceUpdateError: balanceUpdateResult.error?.message ?? null,
    });

    if (balanceUpdateResult.error) {
      return jsonError("Failed to update the user credit balance.", 500, "balance_update_failed", {
        userId,
        currentBalance,
      });
    }

    if (!balanceUpdateResult.data) {
      const postUpdateLookupResult = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      const postUpdateBalance = normalizeCreditsBalance(postUpdateLookupResult.data?.balance);

      logDeductCheckpoint("balance-update-follow-up", {
        userId,
        hasCreditsRow: Boolean(postUpdateLookupResult.data),
        currentBalance: postUpdateBalance,
        followUpError: postUpdateLookupResult.error?.message ?? null,
      });

      if (postUpdateLookupResult.error) {
        return jsonError("Failed to update the user credit balance.", 500, "balance_update_failed", {
          userId,
          currentBalance,
        });
      }

      if (!postUpdateLookupResult.data) {
        return jsonError("No credits row found for the authenticated user.", 404, "credits_row_not_found", {
          userId,
        });
      }

      if (postUpdateBalance < STEAM_TAG_TOOL_CREDIT_COST) {
        return jsonError(STEAM_TAG_TOOL_CREDIT_REQUIRED_MESSAGE, 403, "insufficient_credits", {
          userId,
          currentBalance: postUpdateBalance,
        });
      }

      return jsonError("Failed to update the user credit balance.", 500, "balance_update_failed", {
        userId,
        currentBalance: postUpdateBalance,
      });
    }

    logDeductCheckpoint("credit-transactions-insert", {
      attempted: false,
      result: "not_applicable",
      reason:
        "The Steam page deduct route does not insert into public.credit_transactions. The current schema is purchase-oriented and does not record 1-credit tool deductions there.",
    });

    const remainingCredits = normalizeCreditsBalance(balanceUpdateResult.data.balance);

    logDeductCheckpoint("success", {
      userId,
      remainingCredits,
    });

    return NextResponse.json({
      remainingCredits,
    });
  } catch (error) {
    logDeductThrownError(error);

    return jsonError("Unexpected error during Steam Tag Tool credit deduction.", 500, "unexpected_error");
  }
}