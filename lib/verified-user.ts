import type { User } from "@supabase/supabase-js";

export const VERIFIED_EMAIL_REQUIRED_MESSAGE =
  "Please confirm your email address before continuing.";

type SupabaseUserLookupClient = {
  auth: {
    getUser: (jwt?: string) => Promise<{
      data: {
        user: User | null;
      };
      error: {
        message?: string | null;
      } | null;
    }>;
  };
};

type RequireVerifiedUserResult =
  | {
      ok: true;
      user: User;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
      authErrorMessage?: string | null;
    };

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function isSupabaseUserEmailVerified(user: User | null | undefined): boolean {
  if (!user?.email) {
    return false;
  }

  const extendedUser = user as User & {
    confirmed_at?: string | null;
    email_confirmed_at?: string | null;
  };

  return Boolean(
    readNonEmptyString(extendedUser.email_confirmed_at) ??
      readNonEmptyString(extendedUser.confirmed_at)
  );
}

export async function requireVerifiedUser(
  supabase: SupabaseUserLookupClient,
  accessToken?: string | null
): Promise<RequireVerifiedUserResult> {
  const {
    data: { user },
    error: authError,
  } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized.",
      authErrorMessage: authError?.message ?? null,
    };
  }

  if (!isSupabaseUserEmailVerified(user)) {
    return {
      ok: false,
      status: 403,
      error: VERIFIED_EMAIL_REQUIRED_MESSAGE,
    };
  }

  return {
    ok: true,
    user,
  };
}