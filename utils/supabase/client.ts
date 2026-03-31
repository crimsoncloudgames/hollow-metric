import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const missingSupabaseClientEnvMessage =
  "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.";

let hasWarnedMissingEnv = false;

export const createClient = () =>
  {
    if (!supabaseUrl || !supabaseKey) {
      if (typeof window !== "undefined" && !hasWarnedMissingEnv) {
        hasWarnedMissingEnv = true;
        console.error(missingSupabaseClientEnvMessage);
      }

      return null;
    }

    return createBrowserClient(
      supabaseUrl,
      supabaseKey,
    );
  };
