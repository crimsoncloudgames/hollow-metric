import { cookies } from "next/headers";
import { normalizeCreditsBalance } from "@/lib/credits-ui";
import { createClient as createServerClient, hasSupabaseServerEnv } from "@/utils/supabase/server";

export const STEAM_TAG_TOOL_CREDIT_COST = 1;
export const STEAM_TAG_TOOL_CREDIT_REQUIRED_MESSAGE = "At least 1 credit is required to use the Steam Tag Tool.";
export const STEAM_TAG_TOOL_CREDIT_DEDUCTION_FAILED_MESSAGE = "Tag generation succeeded, but credit deduction failed.";

type SteamTagToolCreditsGateResult =
  | {
      ok: true;
      userId: string;
      balance: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

type SteamTagToolCreditDeductionResult =
  | {
      ok: true;
      remainingBalance: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

type SteamTagToolAuthContext = {
  source: string;
  accessToken?: string | null;
};

function logSteamTagToolCreditsDebug(message: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info(message, payload);
}

export function getSupabaseAccessTokenFromAuthorizationHeader(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const bearerMatch = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const accessToken = bearerMatch?.[1]?.trim();

  return accessToken ? accessToken : null;
}

async function createCreditsServerClient(accessToken?: string | null) {
  const cookieStore = await cookies();
  const authorizationHeader = accessToken ? `Bearer ${accessToken}` : null;

  return createServerClient(
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

export async function requireSteamTagToolCredits(
  authContext?: SteamTagToolAuthContext
): Promise<SteamTagToolCreditsGateResult> {
  if (!hasSupabaseServerEnv) {
    return {
      ok: false,
      status: 500,
      error: "Supabase configuration error.",
    };
  }

  const supabase = await createCreditsServerClient(authContext?.accessToken);

  if (!supabase) {
    return {
      ok: false,
      status: 500,
      error: "Supabase configuration error.",
    };
  }

  const {
    data: { user },
    error: authError,
  } = authContext?.accessToken
    ? await supabase.auth.getUser(authContext.accessToken)
    : await supabase.auth.getUser();

  if (authError || !user) {
    logSteamTagToolCreditsDebug("Steam Tag Tool credits gate auth", {
      source: authContext?.source ?? "unknown",
      authSource: authContext?.accessToken ? "authorization-header" : "cookies",
      userId: user?.id ?? null,
      authError: authError?.message ?? null,
    });

    return {
      ok: false,
      status: 401,
      error: "Unauthorized.",
    };
  }

  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user credits for Steam Tag Tool gate", {
      error,
      userId: user.id,
    });

    return {
      ok: false,
      status: 500,
      error: "We couldn't verify your credits right now. Please try again.",
    };
  }

  const balance = normalizeCreditsBalance(data?.balance);

  logSteamTagToolCreditsDebug("Steam Tag Tool credits gate lookup", {
    source: authContext?.source ?? "unknown",
    authSource: authContext?.accessToken ? "authorization-header" : "cookies",
    userId: user.id,
    hasCreditRow: Boolean(data),
    balance,
  });

  if (balance < STEAM_TAG_TOOL_CREDIT_COST) {
    return {
      ok: false,
      status: 403,
      error: STEAM_TAG_TOOL_CREDIT_REQUIRED_MESSAGE,
    };
  }

  return {
    ok: true,
    userId: user.id,
    balance,
  };
}

export async function deductSteamTagToolCredit(
  userId: string,
  currentBalance: number,
  authContext?: SteamTagToolAuthContext
): Promise<SteamTagToolCreditDeductionResult> {
  if (!hasSupabaseServerEnv) {
    return {
      ok: false,
      status: 500,
      error: "Supabase configuration error.",
    };
  }

  const supabase = await createCreditsServerClient(authContext?.accessToken);

  if (!supabase) {
    return {
      ok: false,
      status: 500,
      error: "Supabase configuration error.",
    };
  }

  const nextBalance = Math.max(0, normalizeCreditsBalance(currentBalance) - STEAM_TAG_TOOL_CREDIT_COST);
  const { data, error } = await supabase
    .from("user_credits")
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .gte("balance", STEAM_TAG_TOOL_CREDIT_COST)
    .select("balance")
    .maybeSingle();

  if (error) {
    console.error("Failed to deduct Steam Tag Tool credit", {
      error,
      source: authContext?.source ?? "unknown",
      userId,
    });

    return {
      ok: false,
      status: 500,
      error: STEAM_TAG_TOOL_CREDIT_DEDUCTION_FAILED_MESSAGE,
    };
  }

  if (!data) {
    return {
      ok: false,
      status: 500,
      error: STEAM_TAG_TOOL_CREDIT_DEDUCTION_FAILED_MESSAGE,
    };
  }

  return {
    ok: true,
    remainingBalance: normalizeCreditsBalance(data.balance),
  };
}