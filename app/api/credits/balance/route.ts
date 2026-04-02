import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);

    if (!supabase) {
      return NextResponse.json({ error: "Supabase configuration error" }, { status: 500 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO(security): Enforce RLS on user_credits so users can only read their own balance row.
    // TODO(security): Subscription/plan state must come from trusted billing source, not client input.
    const { data, error } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle<{ balance: number }>();

    if (error) {
      // Table may not exist yet — return 0 gracefully rather than crashing.
      if (error.code === "42P01") {
        return NextResponse.json({ balance: 0 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ balance: data?.balance ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
