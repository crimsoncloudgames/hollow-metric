import { NextResponse } from "next/server";
import { PAID_SUBSCRIPTIONS_UNAVAILABLE_MESSAGE } from "@/lib/billing";

export const runtime = "nodejs";
export async function POST() {
  return NextResponse.json({
    error: PAID_SUBSCRIPTIONS_UNAVAILABLE_MESSAGE,
  }, { status: 503 });
}
