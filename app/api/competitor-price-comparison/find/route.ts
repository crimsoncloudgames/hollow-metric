import { NextRequest, NextResponse } from "next/server";

import { findCompetitorsForSteamUrl } from "../shared";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type FindCompetitorRequest = {
  url?: string;
};

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonError("Server is missing OPENAI_API_KEY.", 500);
  }

  let body: FindCompetitorRequest;

  try {
    body = (await request.json()) as FindCompetitorRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const steamUrl = typeof body.url === "string" ? body.url.trim() : "";

  if (!steamUrl) {
    return jsonError("A Steam URL is required.", 400);
  }

  try {
    const result = await findCompetitorsForSteamUrl(steamUrl);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      const message = error.message.trim();

      if (message === "Enter a valid Steam store URL.") {
        return jsonError(message, 400);
      }

      if (
        message === "We couldn't read that Steam page right now." ||
        message === "We couldn't generate comparable games right now." ||
        message === "We couldn't generate enough useful comparable games right now." ||
        message === "We couldn't resolve enough comparable games right now."
      ) {
        return jsonError(message, 502);
      }

      return jsonError(message, 500);
    }

    return jsonError("We couldn't find comparable competitors right now. Please try again.", 500);
  }
}
