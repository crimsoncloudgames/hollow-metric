import { cookies } from "next/headers";
import { normalizeCreditsBalance } from "@/lib/credits-ui";
import { createClient as createServerClient, hasSupabaseServerEnv } from "@/utils/supabase/server";

export const STEAM_TAG_TOOL_CREDIT_COST = 1;
export const STEAM_TAG_TOOL_CREDIT_REQUIRED_MESSAGE = "At least 1 credit is required to use the Steam Tag Tool.";
export const STEAM_TAG_TOOL_CREDIT_DEDUCTION_FAILED_MESSAGE = "Tag generation succeeded, but credit deduction failed.";
export const GAME_IDEA_GENERATOR_CREDIT_COST = 1;
export const GAME_IDEA_GENERATOR_CREDIT_REQUIRED_MESSAGE = "1 credit or more needed for generation";
export const GAME_IDEA_GENERATOR_CREDIT_DEDUCTION_FAILED_MESSAGE =
  "Game idea generation succeeded, but credit deduction failed.";

type CreditsGateResult =
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

type CreditDeductionResult =
  | {
      ok: true;
      remainingBalance: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

type CreditsAuthContext = {
  source: string;
  accessToken?: string | null;
};

function logCreditsDebug(message: string, payload: Record<string, unknown>) {
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

async function requireCredits(
  requiredCost: number,
  insufficientCreditsMessage: string,
  authContext?: CreditsAuthContext
): Promise<CreditsGateResult> {
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
    logCreditsDebug("Credits gate auth", {
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
    console.error("Failed to load user credits for credits gate", {
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

  logCreditsDebug("Credits gate lookup", {
    source: authContext?.source ?? "unknown",
    authSource: authContext?.accessToken ? "authorization-header" : "cookies",
    userId: user.id,
    hasCreditRow: Boolean(data),
    balance,
  });

  if (balance < requiredCost) {
    return {
      ok: false,
      status: 403,
      error: insufficientCreditsMessage,
    };
  }

  return {
    ok: true,
    userId: user.id,
    balance,
  };
}

async function deductCredit(
  userId: string,
  currentBalance: number,
  creditCost: number,
  deductionFailedMessage: string,
  authContext?: CreditsAuthContext
): Promise<CreditDeductionResult> {
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

  const nextBalance = Math.max(0, normalizeCreditsBalance(currentBalance) - creditCost);
  const { data, error } = await supabase
    .from("user_credits")
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .gte("balance", creditCost)
    .select("balance")
    .maybeSingle();

  if (error) {
    console.error("Failed to deduct credit", {
      error,
      source: authContext?.source ?? "unknown",
      userId,
    });

    return {
      ok: false,
      status: 500,
      error: deductionFailedMessage,
    };
  }

  if (!data) {
    return {
      ok: false,
      status: 500,
      error: deductionFailedMessage,
    };
  }

  return {
    ok: true,
    remainingBalance: normalizeCreditsBalance(data.balance),
  };
}

export async function requireSteamTagToolCredits(
  authContext?: CreditsAuthContext
): Promise<CreditsGateResult> {
  return requireCredits(
    STEAM_TAG_TOOL_CREDIT_COST,
    STEAM_TAG_TOOL_CREDIT_REQUIRED_MESSAGE,
    authContext
  );
}

export async function deductSteamTagToolCredit(
  userId: string,
  currentBalance: number,
  authContext?: CreditsAuthContext
): Promise<CreditDeductionResult> {
  return deductCredit(
    userId,
    currentBalance,
    STEAM_TAG_TOOL_CREDIT_COST,
    STEAM_TAG_TOOL_CREDIT_DEDUCTION_FAILED_MESSAGE,
    authContext
  );
}

export async function requireGameIdeaGeneratorCredits(
  authContext?: CreditsAuthContext
): Promise<CreditsGateResult> {
  return requireCredits(
    GAME_IDEA_GENERATOR_CREDIT_COST,
    GAME_IDEA_GENERATOR_CREDIT_REQUIRED_MESSAGE,
    authContext
  );
}

export async function deductGameIdeaGeneratorCredit(
  userId: string,
  currentBalance: number,
  authContext?: CreditsAuthContext
): Promise<CreditDeductionResult> {
  return deductCredit(
    userId,
    currentBalance,
    GAME_IDEA_GENERATOR_CREDIT_COST,
    GAME_IDEA_GENERATOR_CREDIT_DEDUCTION_FAILED_MESSAGE,
    authContext
  );
}