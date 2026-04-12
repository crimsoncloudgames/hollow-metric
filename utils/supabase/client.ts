import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();

export const missingSupabaseClientEnvMessage =
  "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.";

let hasWarnedMissingEnv = false;
let browserSupabaseClient: SupabaseClient | null = null;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    if (typeof window !== "undefined" && !hasWarnedMissingEnv) {
      hasWarnedMissingEnv = true;
      console.error(missingSupabaseClientEnvMessage);
    }

    return null;
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createBrowserClient(supabaseUrl, supabaseKey);
  }

  return browserSupabaseClient;
};
