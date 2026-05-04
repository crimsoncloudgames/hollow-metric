import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

const allowedTotalCostRanges = [
  "0-1000",
  "1000-5000",
  "5000-10000",
  "10000-25000",
  "25000-50000",
  "50000+",
] as const;

const allowedBreakEvenCopiesRanges = [
  "0-100",
  "100-500",
  "500-1000",
  "1000-5000",
  "5000-10000",
  "10000+",
] as const;

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseRange = <T extends readonly string[]>(
  value: unknown,
  allowed: T
): T[number] | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return allowed.includes(normalized as T[number]) ? (normalized as T[number]) : null;
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Landing calculator tracking skipped: missing Supabase service role configuration.");
    return NextResponse.json({ ok: true });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Landing calculator tracking failed to parse payload.", error);
    return NextResponse.json({ ok: true });
  }

  if (!payload || typeof payload !== "object") {
    console.error("Landing calculator tracking received invalid payload.");
    return NextResponse.json({ ok: true });
  }

  const body = payload as Record<string, unknown>;
  const total_cost_range = parseRange(body.total_cost_range, allowedTotalCostRanges);
  const break_even_copies_range = parseRange(body.break_even_copies_range, allowedBreakEvenCopiesRanges);

  const insertPayload = {
    event_name: "completed_calculation",
    source: "landing_page",
    total_cost_range,
    game_price: parseNumber(body.game_price),
    refund_rate: parseNumber(body.refund_rate),
    withholding_rate: parseNumber(body.withholding_rate),
    publisher_split: parseNumber(body.publisher_split),
    break_even_copies_range,
  };

  try {
    const supabase = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from("landing_calculator_events").insert(insertPayload);

    if (error) {
      console.error("Landing calculator tracking insert failed.", error);
    }
  } catch (error) {
    console.error("Landing calculator tracking server error.", error);
  }

  return NextResponse.json({ ok: true });
}
