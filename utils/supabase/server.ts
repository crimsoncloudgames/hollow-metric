import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
)?.trim();

export const hasSupabaseServerEnv = Boolean(supabaseUrl && supabaseKey);

type CreateSupabaseServerClientOptions = NonNullable<Parameters<typeof createSupabaseServerClient>[2]>;

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  options?: Omit<CreateSupabaseServerClientOptions, "cookies">
) => {
  if (!hasSupabaseServerEnv) {
    return null;
  }

  const url = supabaseUrl!;
  const key = supabaseKey!;

  try {
    return createSupabaseServerClient(
      url,
      key,
      {
        ...options,
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    );
  } catch {
    return null;
  }
};
