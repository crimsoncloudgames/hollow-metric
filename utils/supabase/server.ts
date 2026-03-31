import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
)?.trim();

export const hasSupabaseServerEnv = Boolean(supabaseUrl && supabaseKey);

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  if (!hasSupabaseServerEnv) {
    return null;
  }

  const url = supabaseUrl!;
  const key = supabaseKey!;

  try {
    return createServerClient(
      url,
      key,
      {
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
