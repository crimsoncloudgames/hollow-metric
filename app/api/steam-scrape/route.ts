import axios from "axios";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

type SteamScrapeRequestBody = {
  url?: string;
};

const STEAM_APP_ID_PATTERN = /\/app\/(\d+)/i;
const STEAM_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

export const runtime = "nodejs";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseSteamUrl(rawUrl: string): { url: string; appId: string } | null {
  try {
    const parsedUrl = new URL(rawUrl);
    const isHttp = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    const isSteamHost = /(^|\.)steampowered\.com$/i.test(parsedUrl.hostname);
    const appId = parsedUrl.pathname.match(STEAM_APP_ID_PATTERN)?.[1];

    if (!isHttp || !isSteamHost || !appId) {
      return null;
    }

    return {
      url: parsedUrl.toString(),
      appId,
    };
  } catch {
    return null;
  }
}

function extractCurrentTags($: cheerio.CheerioAPI): string[] {
  const seen = new Set<string>();
  const currentTags: string[] = [];

  $(".app_tag").each((_, element) => {
    const tag = normalizeText($(element).text());

    if (!tag || tag === "+" || seen.has(tag)) {
      return;
    }

    seen.add(tag);
    currentTags.push(tag);
  });

  return currentTags;
}

export async function POST(request: NextRequest) {
  let body: SteamScrapeRequestBody;

  try {
    body = (await request.json()) as SteamScrapeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const steamUrl = typeof body.url === "string" ? body.url.trim() : "";

  if (!steamUrl) {
    return NextResponse.json({ error: "A Steam URL is required." }, { status: 400 });
  }

  const parsedSteamUrl = parseSteamUrl(steamUrl);

  if (!parsedSteamUrl) {
    return NextResponse.json({ error: "Invalid Steam URL." }, { status: 400 });
  }

  try {
    const response = await axios.get<string>(parsedSteamUrl.url, {
      headers: {
        "User-Agent": STEAM_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "birthtime=283996801; lastagecheckage=1-0-1990;",
      },
      responseType: "text",
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const title = normalizeText($(".apphub_AppName").first().text());
    const description = normalizeText($(".game_description_snippet").first().text());
    const currentTags = extractCurrentTags($);
    const capsuleUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${parsedSteamUrl.appId}/header.jpg`;

    if (!title) {
      return NextResponse.json({ error: "Steam page loaded, but the game title could not be extracted." }, { status: 500 });
    }

    return NextResponse.json({
      title,
      appId: parsedSteamUrl.appId,
      capsuleUrl,
      currentTags,
      description,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
      return NextResponse.json({ error: "Failed to load the Steam page." }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to load the Steam page." }, { status: 500 });
  }
}