import axios from "axios";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";

import {
  deductCompetitorPriceComparisonCredit,
  getSupabaseAccessTokenFromAuthorizationHeader,
  requireCompetitorPriceComparisonCredits,
} from "@/lib/credits";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

const MODEL_NAME = "gpt-4o-mini";
const MIN_CANDIDATE_TITLES = 8;
const MAX_CANDIDATE_TITLES = 12;
const MAX_RESOLVED_CANDIDATES = 10;
const MAX_FINAL_COMPARABLES = 3;
const MAX_CONTEXT_TAGS = 14;
const MAX_ABOUT_TEXT_LENGTH = 1800;
const MAX_CANDIDATE_ABOUT_TEXT_LENGTH = 900;
const MAX_PROFILE_AXIS_ITEMS = 4;
const MAX_PROFILE_SNIPPETS = 5;
const STEAM_APP_ID_PATTERN = /\/app\/(\d+)/i;
const STEAM_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
const PRICE_LADDER = [
  4.99, 7.99, 9.99, 12.99, 14.99, 16.99, 19.99, 24.99, 29.99, 34.99, 39.99, 44.99, 49.99,
  59.99, 69.99,
];
const DISCLAIMER =
  "Suggested comparable games are provided as pricing context only and may not be perfect matches.";

function logCompetitorPriceComparisonTiming(
  stage: string,
  startedAt: number,
  details?: Record<string, unknown>
) {
  console.info("Competitor price comparison timing", {
    stage,
    durationMs: Math.round(performance.now() - startedAt),
    ...(details ?? {}),
  });
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "them",
  "this",
  "through",
  "to",
  "with",
]);

type FitLabel = "Strong" | "Medium" | "Weak";
type ConfidenceLabel = "high" | "low";
type PricingConfidenceLabel = "high" | "medium" | "low";
type PricingMode = "comparable_backed" | "fallback_market_estimate";
type ProductionTier = "indie" | "mid" | "premium" | "unknown";

type CompetitorPriceComparisonRequest = {
  url?: string;
};

type ScoreAxis =
  | "coreLoop"
  | "playerFantasy"
  | "genreSubgenre"
  | "pacingPressure"
  | "decisionStructure"
  | "tone"
  | "setting"
  | "commercialRelevance";

type CandidateAxisScores = Record<ScoreAxis, number>;
type CandidateMatchedDetails = Record<ScoreAxis, string>;

const SCORE_AXIS_MAXIMA: CandidateAxisScores = {
  coreLoop: 7,
  playerFantasy: 4,
  genreSubgenre: 5,
  pacingPressure: 3,
  decisionStructure: 3,
  tone: 3,
  setting: 2,
  commercialRelevance: 3,
};

const SCORE_AXIS_ORDER: ScoreAxis[] = [
  "coreLoop",
  "playerFantasy",
  "genreSubgenre",
  "pacingPressure",
  "decisionStructure",
  "tone",
  "setting",
  "commercialRelevance",
];

type PriceSnapshot = {
  currentStorePrice: string;
  originalListPrice: string;
  comparisonPrice: string;
  isDiscounted: boolean;
  discountPercent: number;
};

type GameStoreSnapshot = {
  appId: string;
  title: string;
  shortDescription: string;
  aboutThisGame: string;
  currentTags: string[];
  genres: string[];
  categories: string[];
  developers: string[];
  publishers: string[];
  releaseDate: string;
  currentStorePrice: string;
  originalListPrice: string;
  comparisonPrice: string;
  isDiscounted: boolean;
  discountPercent: number;
};

type SteamStoreData = GameStoreSnapshot;
type ComparableGameDetails = GameStoreSnapshot;

type SemanticProfile = {
  coreGameplayLoop: string[];
  playerFantasy: string[];
  genreSubgenre: string[];
  pacingPressure: string[];
  decisionStructure: string[];
  tone: string[];
  setting: string[];
  commercialRelevance: string[];
  productionTier: ProductionTier;
  evidenceSnippets: string[];
  summary: string;
};

type StructuredGameProfile = {
  title: string;
  developers: string[];
  publishers: string[];
  currentPrice: string;
  originalListPrice: string;
  comparisonPrice: string;
  tags: string[];
  genres: string[];
  categories: string[];
  coreGameplayLoop: string[];
  playerFantasy: string[];
  genreSubgenre: string[];
  pacingPressure: string[];
  decisionStructure: string[];
  tone: string[];
  setting: string[];
  commercialRelevance: string[];
  productionTier: ProductionTier;
  evidenceSnippets: string[];
  summary: string;
};

type CandidateTitlePayload = {
  candidates?: unknown;
};

type ProfileExtractionPayload = {
  profiles?: unknown;
};

type SteamSearchCandidate = {
  appId: string;
  title: string;
};

type ResolvedCandidate = ComparableGameDetails & {
  profile: StructuredGameProfile;
};

type AxisScoreResult = {
  score: number;
  details: string[];
  detail: string;
};

type ScoredCandidate = ResolvedCandidate & {
  score: number;
  fitLabel: FitLabel;
  reason: string;
  axisScores: CandidateAxisScores;
  matchedDetails: CandidateMatchedDetails;
  priceKnown: boolean;
  selected: boolean;
};

type PricedScoredCandidate = ScoredCandidate & {
  numericPrice: number;
  fallbackWeight: number;
};

type ComparableGameResult = {
  title: string;
  currentPrice: string;
  reason: string;
  fitLabel: FitLabel;
};

type PricingSuggestion = {
  suggested_price_range_min: string;
  suggested_price_range_max: string;
  recommended_price: string;
  pricing_rationale: string;
};

type SuggestedPriceRange = {
  min: string;
  max: string;
};

type FinalFitCounts = {
  strong: number;
  medium: number;
  weak: number;
};

type ConfidenceDecision = {
  confidence: ConfidenceLabel;
  confidenceReason: string;
  confidenceGatePassed: boolean;
  gateReason: string;
  finalFitCounts: FinalFitCounts;
};

type ResolvedCandidateResponse = {
  title: string;
  current_price: string;
  current_store_price: string;
  original_list_price: string;
  comparison_price: string;
  score: number;
  fitLabel: FitLabel;
  reason: string;
  axis_scores: CandidateAxisScores;
  matched_factors: CandidateMatchedDetails;
  selected: boolean;
  profile: StructuredGameProfile;
};

type CompetitorPriceComparisonResponse = {
  sourceGameTitle: string;
  comparables: ComparableGameResult[];
  remainingCredits?: number;
  disclaimer: string;
  confidence: ConfidenceLabel;
  confidence_reason: string;
  suggested_price_range_min: string;
  suggested_price_range_max: string;
  recommended_price: string;
  pricing_rationale: string;
  pricing_allowed: boolean;
  pricing_gate_reason: string;
  pricingMode: PricingMode;
  pricingConfidence: PricingConfidenceLabel;
  recommendedLaunchPrice: string;
  suggestedPriceRange: SuggestedPriceRange;
  pricingExplanation: string;
  confidenceGatePassed: boolean;
  finalFitCounts: FinalFitCounts;
  source_profile: StructuredGameProfile;
  resolved_candidates: ResolvedCandidateResponse[];
};

type CompetitorPriceComparisonErrorCode =
  | "COMPETITOR_CREDIT_RACE"
  | "COMPETITOR_CREDIT_DEDUCTION_FAILED";

function jsonError(
  message: string,
  status: number,
  code?: CompetitorPriceComparisonErrorCode
) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength).trim()}...`;
}

function normalizeComparisonKey(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    const comparisonKey = normalized.toLowerCase();

    if (!normalized || seen.has(comparisonKey)) {
      continue;
    }

    seen.add(comparisonKey);
    result.push(normalized);
  }

  return result;
}

function decodeSteamText(value: string): string {
  const $ = cheerio.load(`<div>${value}</div>`);
  return normalizeText($.text());
}

function cleanSteamHtmlToText(value: string): string {
  const $ = cheerio.load(`<div>${value}</div>`);

  $("br").replaceWith("\n");
  $("li").each((_, element) => {
    $(element).prepend("- ");
  });

  return normalizeText($.text().replace(/About This Game/gi, " "));
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
    const comparisonKey = tag.toLowerCase();

    if (!tag || tag === "+" || seen.has(comparisonKey)) {
      return;
    }

    seen.add(comparisonKey);
    currentTags.push(tag);
  });

  return currentTags;
}

function getTextDescriptionArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const description = (entry as Record<string, unknown>)[field];
      return typeof description === "string" ? normalizeText(description) : "";
    })
    .filter(Boolean);
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? normalizeText(entry) : ""))
    .filter(Boolean);
}

function formatPriceFromCents(amountInCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
}

function readFormattedPriceValue(
  priceOverview: Record<string, unknown>,
  key: "initial" | "final",
  currency: string
) {
  const formattedKey = `${key}_formatted`;
  const formattedValue =
    typeof priceOverview[formattedKey] === "string"
      ? normalizeText(priceOverview[formattedKey] as string)
      : "";

  if (formattedValue) {
    return formattedValue;
  }

  const rawValue = priceOverview[key];

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return formatPriceFromCents(rawValue, currency);
  }

  return "";
}

function readPriceSnapshot(details: Record<string, unknown>): PriceSnapshot {
  if (details.is_free === true) {
    return {
      currentStorePrice: "Free",
      originalListPrice: "Free",
      comparisonPrice: "Free",
      isDiscounted: false,
      discountPercent: 0,
    };
  }

  const priceOverview =
    details.price_overview && typeof details.price_overview === "object"
      ? (details.price_overview as Record<string, unknown>)
      : null;

  if (!priceOverview) {
    return {
      currentStorePrice: "Price unavailable",
      originalListPrice: "Price unavailable",
      comparisonPrice: "Price unavailable",
      isDiscounted: false,
      discountPercent: 0,
    };
  }

  const currency =
    typeof priceOverview.currency === "string" && priceOverview.currency.trim().length > 0
      ? priceOverview.currency.trim().toUpperCase()
      : "USD";
  const discountPercent =
    typeof priceOverview.discount_percent === "number" && Number.isFinite(priceOverview.discount_percent)
      ? priceOverview.discount_percent
      : 0;
  const currentStorePrice =
    readFormattedPriceValue(priceOverview, "final", currency) ||
    readFormattedPriceValue(priceOverview, "initial", currency) ||
    "Price unavailable";
  const originalListPrice =
    readFormattedPriceValue(priceOverview, "initial", currency) || currentStorePrice;
  const comparisonPrice = discountPercent > 0 ? originalListPrice : currentStorePrice || originalListPrice;

  return {
    currentStorePrice,
    originalListPrice,
    comparisonPrice: comparisonPrice || currentStorePrice || originalListPrice || "Price unavailable",
    isDiscounted: discountPercent > 0 && currentStorePrice !== originalListPrice,
    discountPercent,
  };
}

function formatUsdPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseComparablePrice(value: string): number | null {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || /free|unavailable/i.test(normalizedValue)) {
    return null;
  }

  const numericMatch = normalizedValue.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);

  if (!numericMatch?.[1]) {
    return null;
  }

  const parsedValue = Number.parseFloat(numericMatch[1]);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function safeParseJsonObject(rawContent: string, errorMessage: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawContent) as unknown;

    if (!parsed || typeof parsed !== "object") {
      throw new Error(errorMessage);
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(errorMessage);
  }
}

function readTextArray(value: unknown, maxItems = MAX_PROFILE_AXIS_ITEMS): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(
    value
      .map((entry) => (typeof entry === "string" ? normalizeText(entry) : ""))
      .filter(Boolean)
  ).slice(0, maxItems);
}

function readProductionTier(value: unknown): ProductionTier {
  if (typeof value !== "string") {
    return "unknown";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "indie" || normalizedValue === "mid" || normalizedValue === "premium") {
    return normalizedValue;
  }

  return "unknown";
}

function buildStoreSnapshotContext(snapshot: GameStoreSnapshot, maxAboutLength = MAX_ABOUT_TEXT_LENGTH) {
  return [
    `Title: ${snapshot.title}`,
    `Current store price: ${snapshot.currentStorePrice}`,
    `Original list price: ${snapshot.originalListPrice}`,
    `Comparison price anchor: ${snapshot.comparisonPrice}`,
    `Discounted right now: ${snapshot.isDiscounted ? `Yes (${snapshot.discountPercent}% off)` : "No"}`,
    `Release date: ${snapshot.releaseDate || "Unknown"}`,
    `Developers: ${snapshot.developers.join(", ") || "Unknown"}`,
    `Publishers: ${snapshot.publishers.join(", ") || "Unknown"}`,
    `Steam tags: ${snapshot.currentTags.slice(0, MAX_CONTEXT_TAGS).join(", ") || "None extracted"}`,
    `Genres: ${snapshot.genres.slice(0, 6).join(", ") || "None extracted"}`,
    `Categories: ${snapshot.categories.slice(0, 6).join(", ") || "None extracted"}`,
    `Short description: ${snapshot.shortDescription || "None extracted"}`,
    `About summary: ${truncateText(snapshot.aboutThisGame, maxAboutLength) || "None extracted"}`,
  ].join("\n");
}

function buildStructuredProfileContext(profile: StructuredGameProfile) {
  return [
    `Title: ${profile.title}`,
    `Current price: ${profile.currentPrice}`,
    `Original list price: ${profile.originalListPrice}`,
    `Comparison price: ${profile.comparisonPrice}`,
    `Tags: ${profile.tags.join(", ") || "None extracted"}`,
    `Genres: ${profile.genres.join(", ") || "None extracted"}`,
    `Categories: ${profile.categories.join(", ") || "None extracted"}`,
    `Core gameplay loop: ${profile.coreGameplayLoop.join(", ") || "None extracted"}`,
    `Player fantasy: ${profile.playerFantasy.join(", ") || "None extracted"}`,
    `Genre and subgenre: ${profile.genreSubgenre.join(", ") || "None extracted"}`,
    `Pacing / pressure: ${profile.pacingPressure.join(", ") || "None extracted"}`,
    `Decision / consequence structure: ${profile.decisionStructure.join(", ") || "None extracted"}`,
    `Tone: ${profile.tone.join(", ") || "None extracted"}`,
    `Setting: ${profile.setting.join(", ") || "None extracted"}`,
    `Commercial relevance: ${profile.commercialRelevance.join(", ") || "None extracted"}`,
    `Production tier: ${profile.productionTier}`,
    `Evidence snippets: ${profile.evidenceSnippets.join(" | ") || "None extracted"}`,
    `Summary: ${profile.summary || "None extracted"}`,
  ].join("\n");
}

function buildFallbackStructuredProfile(snapshot: GameStoreSnapshot): StructuredGameProfile {
  const fallbackEvidence = snapshot.shortDescription
    ? [truncateText(snapshot.shortDescription, 140)]
    : [];

  return {
    title: snapshot.title,
    developers: snapshot.developers,
    publishers: snapshot.publishers,
    currentPrice: snapshot.currentStorePrice,
    originalListPrice: snapshot.originalListPrice,
    comparisonPrice: snapshot.comparisonPrice,
    tags: snapshot.currentTags,
    genres: snapshot.genres,
    categories: snapshot.categories,
    coreGameplayLoop: [],
    playerFantasy: [],
    genreSubgenre: uniqueStrings([...snapshot.genres]),
    pacingPressure: [],
    decisionStructure: [],
    tone: [],
    setting: [],
    commercialRelevance: [],
    productionTier: "unknown",
    evidenceSnippets: fallbackEvidence,
    summary: truncateText(snapshot.shortDescription || snapshot.aboutThisGame || snapshot.title, 180),
  };
}

function mergeStructuredProfile(
  snapshot: GameStoreSnapshot,
  semanticProfile: SemanticProfile | null
): StructuredGameProfile {
  const fallback = buildFallbackStructuredProfile(snapshot);

  if (!semanticProfile) {
    return fallback;
  }

  return {
    title: snapshot.title,
    developers: snapshot.developers,
    publishers: snapshot.publishers,
    currentPrice: snapshot.currentStorePrice,
    originalListPrice: snapshot.originalListPrice,
    comparisonPrice: snapshot.comparisonPrice,
    tags: snapshot.currentTags,
    genres: snapshot.genres,
    categories: snapshot.categories,
    coreGameplayLoop: semanticProfile.coreGameplayLoop,
    playerFantasy: semanticProfile.playerFantasy,
    genreSubgenre:
      semanticProfile.genreSubgenre.length > 0
        ? semanticProfile.genreSubgenre
        : uniqueStrings(snapshot.genres),
    pacingPressure: semanticProfile.pacingPressure,
    decisionStructure: semanticProfile.decisionStructure,
    tone: semanticProfile.tone,
    setting: semanticProfile.setting,
    commercialRelevance: semanticProfile.commercialRelevance,
    productionTier: semanticProfile.productionTier,
    evidenceSnippets:
      semanticProfile.evidenceSnippets.length > 0
        ? semanticProfile.evidenceSnippets
        : fallback.evidenceSnippets,
    summary: semanticProfile.summary || fallback.summary,
  };
}

function readSemanticProfile(value: unknown): SemanticProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    coreGameplayLoop: readTextArray(record.coreGameplayLoop),
    playerFantasy: readTextArray(record.playerFantasy),
    genreSubgenre: readTextArray(record.genreSubgenre),
    pacingPressure: readTextArray(record.pacingPressure),
    decisionStructure: readTextArray(record.decisionStructure),
    tone: readTextArray(record.tone),
    setting: readTextArray(record.setting),
    commercialRelevance: readTextArray(record.commercialRelevance),
    productionTier: readProductionTier(record.productionTier),
    evidenceSnippets: readTextArray(record.evidenceSnippets, MAX_PROFILE_SNIPPETS),
    summary: typeof record.summary === "string" ? normalizeText(record.summary) : "",
  };
}

async function extractStructuredProfiles(
  snapshots: GameStoreSnapshot[],
  errorMessage: string,
  aboutLength = MAX_CANDIDATE_ABOUT_TEXT_LENGTH
): Promise<StructuredGameProfile[]> {
  const openai = getOpenAIClient();
  const modelStartedAt = performance.now();

  const response = await openai.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You are extracting grounded comparison profiles from Steam store data. Return strict JSON only in this shape: {"profiles":[{"profileIndex":0,"coreGameplayLoop":[""],"playerFantasy":[""],"genreSubgenre":[""],"pacingPressure":[""],"decisionStructure":[""],"tone":[""],"setting":[""],"commercialRelevance":[""],"productionTier":"unknown","evidenceSnippets":[""],"summary":""}]}. Rules: use only the supplied data, do not invent missing facts, keep factor phrases short and reusable, use empty arrays when evidence is weak, keep evidenceSnippets short and grounded in the supplied text, and use concrete labels such as survival resource loop, tactical squad pressure, branching consequences, office response loop, or premium indie horror lane when supported.`,
      },
      {
        role: "user",
        content: snapshots
          .map((snapshot, index) =>
            [
              `Profile index: ${index}`,
              buildStoreSnapshotContext(snapshot, aboutLength),
            ].join("\n")
          )
          .join("\n\n"),
      },
    ],
  });

  logCompetitorPriceComparisonTiming("structured-profile-model-call", modelStartedAt, {
    snapshotCount: snapshots.length,
    aboutLength,
  });

  const rawContent = response.choices[0]?.message?.content?.trim();

  if (!rawContent) {
    throw new Error(errorMessage);
  }

  const parsed = safeParseJsonObject(rawContent, errorMessage) as ProfileExtractionPayload;
  const profileEntries = Array.isArray(parsed.profiles) ? parsed.profiles : [];
  const profileMap = new Map<number, SemanticProfile>();

  for (const entry of profileEntries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const profileIndex =
      typeof record.profileIndex === "number" && Number.isInteger(record.profileIndex)
        ? record.profileIndex
        : null;
    const semanticProfile = readSemanticProfile(record);

    if (profileIndex === null || !snapshots[profileIndex] || !semanticProfile) {
      continue;
    }

    profileMap.set(profileIndex, semanticProfile);
  }

  return snapshots.map((snapshot, index) =>
    mergeStructuredProfile(snapshot, profileMap.get(index) ?? null)
  );
}

async function fetchSteamStoreData(rawUrl: string): Promise<SteamStoreData> {
  const parsedSteamUrl = parseSteamUrl(rawUrl);

  if (!parsedSteamUrl) {
    throw new Error("Enter a valid Steam store URL.");
  }

  const [pageResponse, detailsResponse] = await Promise.all([
    axios.get<string>(parsedSteamUrl.url, {
      headers: {
        "User-Agent": STEAM_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "birthtime=283996801; lastagecheckage=1-0-1990;",
      },
      responseType: "text",
      timeout: 15000,
    }),
    fetch(
      `https://store.steampowered.com/api/appdetails?appids=${parsedSteamUrl.appId}&cc=US&l=english`,
      {
        cache: "no-store",
        headers: {
          "User-Agent": STEAM_USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    ),
  ]);

  if (!detailsResponse.ok) {
    throw new Error("We couldn't read that Steam page right now.");
  }

  const $ = cheerio.load(pageResponse.data);
  const detailsPayload = (await detailsResponse.json()) as Record<
    string,
    { data?: Record<string, unknown> }
  >;
  const details = detailsPayload?.[parsedSteamUrl.appId]?.data ?? {};
  const priceSnapshot = readPriceSnapshot(details);

  const title =
    normalizeText($(".apphub_AppName").first().text()) ||
    (typeof details.name === "string" ? normalizeText(details.name) : "");
  const shortDescription =
    (typeof details.short_description === "string"
      ? decodeSteamText(details.short_description)
      : "") || normalizeText($(".game_description_snippet").first().text());
  const aboutFromPage = normalizeText(
    $("#game_area_description").first().text().replace(/About This Game/i, " ")
  );
  const aboutFromApi =
    typeof details.about_the_game === "string"
      ? cleanSteamHtmlToText(details.about_the_game)
      : typeof details.detailed_description === "string"
        ? cleanSteamHtmlToText(details.detailed_description)
        : "";
  const aboutThisGame = aboutFromApi || aboutFromPage || shortDescription;
  const currentTags = extractCurrentTags($);
  const genres = getTextDescriptionArray(details.genres, "description");
  const categories = getTextDescriptionArray(details.categories, "description");
  const developers = getStringArray(details.developers);
  const publishers = getStringArray(details.publishers);
  const releaseDate =
    details.release_date && typeof details.release_date === "object"
      ? typeof (details.release_date as Record<string, unknown>).date === "string"
        ? normalizeText((details.release_date as Record<string, unknown>).date as string)
        : ""
      : "";

  if (!title) {
    throw new Error("We couldn't read that Steam page right now.");
  }

  return {
    appId: parsedSteamUrl.appId,
    title,
    shortDescription,
    aboutThisGame,
    currentTags,
    genres,
    categories,
    developers,
    publishers,
    releaseDate,
    currentStorePrice: priceSnapshot.currentStorePrice,
    originalListPrice: priceSnapshot.originalListPrice,
    comparisonPrice: priceSnapshot.comparisonPrice,
    isDiscounted: priceSnapshot.isDiscounted,
    discountPercent: priceSnapshot.discountPercent,
  };
}

async function buildSourceProfile(storeData: SteamStoreData): Promise<StructuredGameProfile> {
  const [profile] = await extractStructuredProfiles(
    [storeData],
    "We couldn't build a useful source profile right now.",
    MAX_ABOUT_TEXT_LENGTH
  );

  const hasSemanticEvidence =
    profile.coreGameplayLoop.length > 0 ||
    profile.playerFantasy.length > 0 ||
    profile.genreSubgenre.length > 0 ||
    profile.pacingPressure.length > 0 ||
    profile.decisionStructure.length > 0 ||
    profile.tone.length > 0 ||
    profile.setting.length > 0 ||
    profile.commercialRelevance.length > 0 ||
    profile.summary.length > 0;

  if (!hasSemanticEvidence) {
    throw new Error("We couldn't build a useful source profile right now.");
  }

  return profile;
}

async function requestCandidateTitles(
  storeData: SteamStoreData,
  sourceProfile: StructuredGameProfile
): Promise<string[]> {
  const openai = getOpenAIClient();
  const modelStartedAt = performance.now();

  const response = await openai.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You are building a broad candidate pool of Steam pricing comparables for later reranking. Return strict JSON only in this shape: {"candidates":["Game Title"]}. Return between ${MIN_CANDIDATE_TITLES} and ${MAX_CANDIDATE_TITLES} title strings only. Prioritize real market comparables a customer could plausibly cross-shop. Prefer alignment on core gameplay loop, player fantasy, genre and subgenre, pacing / pressure, decision structure, tone, setting, and commercial lane. Avoid bad matches that only share art style, setting, or loose thematic vibe. Include some diversity inside the candidate pool so reranking has options.`,
      },
      {
        role: "user",
        content: [
          "Source Steam store snapshot:",
          buildStoreSnapshotContext(storeData, MAX_ABOUT_TEXT_LENGTH),
          "Structured source profile:",
          buildStructuredProfileContext(sourceProfile),
        ].join("\n\n"),
      },
    ],
  });

  logCompetitorPriceComparisonTiming("candidate-title-model-call", modelStartedAt, {
    sourceTitle: storeData.title,
  });

  const rawContent = response.choices[0]?.message?.content?.trim();

  if (!rawContent) {
    throw new Error("We couldn't generate comparable games right now.");
  }

  const parsed = safeParseJsonObject(
    rawContent,
    "We couldn't generate comparable games right now."
  ) as CandidateTitlePayload;
  const candidateTitles = Array.isArray(parsed.candidates)
    ? uniqueStrings(
      parsed.candidates.flatMap((entry) => {
        if (typeof entry === "string") {
          const title = normalizeText(entry);
          return title ? [title] : [];
        }

        if (entry && typeof entry === "object") {
          const title = typeof (entry as Record<string, unknown>).title === "string"
            ? normalizeText((entry as Record<string, unknown>).title as string)
            : "";
          return title ? [title] : [];
        }

        return [];
      })
    ).slice(0, MAX_CANDIDATE_TITLES)
    : [];

  if (candidateTitles.length < MIN_CANDIDATE_TITLES) {
    throw new Error("We couldn't generate enough useful comparable games right now.");
  }

  return candidateTitles;
}

function extractSteamSearchCandidates(value: unknown): SteamSearchCandidate[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const items = (value as { items?: unknown }).items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;
    const title = typeof record.name === "string" ? normalizeText(record.name) : "";
    const type = typeof record.type === "string" ? record.type.trim().toLowerCase() : "";
    const id = record.id;

    if (!title || type !== "app") {
      return [];
    }

    if (typeof id !== "number" || !Number.isInteger(id)) {
      return [];
    }

    return [{ appId: String(id), title }];
  });
}

function scoreSteamSearchCandidate(candidateTitle: string, requestedTitle: string) {
  const normalizedCandidate = normalizeComparisonKey(candidateTitle);
  const normalizedRequested = normalizeComparisonKey(requestedTitle);

  if (!normalizedCandidate || !normalizedRequested) {
    return -1;
  }

  if (normalizedCandidate === normalizedRequested) {
    return 100;
  }

  if (
    normalizedCandidate.startsWith(normalizedRequested) ||
    normalizedRequested.startsWith(normalizedCandidate)
  ) {
    return 75;
  }

  if (
    normalizedCandidate.includes(normalizedRequested) ||
    normalizedRequested.includes(normalizedCandidate)
  ) {
    return 50;
  }

  const candidateWords = new Set(normalizedCandidate.split(" "));
  const requestedWords = normalizedRequested.split(" ");
  const sharedWordCount = requestedWords.filter((word) => candidateWords.has(word)).length;

  return sharedWordCount > 0 ? sharedWordCount * 10 : 0;
}

async function searchSteamComparableGame(
  title: string,
  excludedAppId: string
): Promise<SteamSearchCandidate | null> {
  const response = await fetch(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
    {
      cache: "no-store",
      headers: {
        "User-Agent": STEAM_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  const candidates = extractSteamSearchCandidates(payload)
    .filter((candidate) => candidate.appId !== excludedAppId)
    .map((candidate, index) => ({
      candidate,
      score: scoreSteamSearchCandidate(candidate.title, title) - index,
    }))
    .sort((left, right) => right.score - left.score);

  return candidates[0] && candidates[0].score > 0 ? candidates[0].candidate : null;
}

async function fetchComparableGameDetails(appId: string): Promise<ComparableGameDetails | null> {
  const response = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=US&l=english`,
    {
      cache: "no-store",
      headers: {
        "User-Agent": STEAM_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Record<string, { data?: Record<string, unknown> }>;
  const details = payload?.[appId]?.data;

  if (!details) {
    return null;
  }

  const title = typeof details.name === "string" ? normalizeText(details.name) : "";
  const shortDescription =
    typeof details.short_description === "string"
      ? decodeSteamText(details.short_description)
      : "";
  const aboutThisGame =
    typeof details.about_the_game === "string"
      ? cleanSteamHtmlToText(details.about_the_game)
      : typeof details.detailed_description === "string"
        ? cleanSteamHtmlToText(details.detailed_description)
        : shortDescription;
  const genres = getTextDescriptionArray(details.genres, "description");
  const categories = getTextDescriptionArray(details.categories, "description");
  const developers = getStringArray(details.developers);
  const publishers = getStringArray(details.publishers);
  const releaseDate =
    details.release_date && typeof details.release_date === "object"
      ? typeof (details.release_date as Record<string, unknown>).date === "string"
        ? normalizeText((details.release_date as Record<string, unknown>).date as string)
        : ""
      : "";
  const priceSnapshot = readPriceSnapshot(details);

  if (!title) {
    return null;
  }

  return {
    appId,
    title,
    shortDescription,
    aboutThisGame,
    currentTags: [],
    genres,
    categories,
    developers,
    publishers,
    releaseDate,
    currentStorePrice: priceSnapshot.currentStorePrice,
    originalListPrice: priceSnapshot.originalListPrice,
    comparisonPrice: priceSnapshot.comparisonPrice,
    isDiscounted: priceSnapshot.isDiscounted,
    discountPercent: priceSnapshot.discountPercent,
  };
}

async function resolveCandidates(
  candidateTitles: string[],
  excludedAppId: string
): Promise<ComparableGameDetails[]> {
  const resolutionStartedAt = performance.now();
  const resolved = await Promise.all(
    candidateTitles.map(async (candidateTitle, index) => {
      try {
        const searchMatch = await searchSteamComparableGame(candidateTitle, excludedAppId);

        if (!searchMatch) {
          return null;
        }

        const details = await fetchComparableGameDetails(searchMatch.appId);

        if (!details) {
          return null;
        }

        return {
          index,
          candidate: details,
        };
      } catch {
        return null;
      }
    })
  );

  const seenAppIds = new Set<string>();

  const resolvedCandidates = resolved
    .filter(
      (
        entry
      ): entry is {
        index: number;
        candidate: ComparableGameDetails;
      } => Boolean(entry)
    )
    .sort((left, right) => left.index - right.index)
    .filter((entry) => {
      if (seenAppIds.has(entry.candidate.appId)) {
        return false;
      }

      seenAppIds.add(entry.candidate.appId);
      return true;
    })
    .map((entry) => entry.candidate)
    .slice(0, MAX_RESOLVED_CANDIDATES);

  logCompetitorPriceComparisonTiming("steam-app-resolution", resolutionStartedAt, {
    requestedTitles: candidateTitles.length,
    resolvedCount: resolvedCandidates.length,
  });

  return resolvedCandidates;
}

async function buildResolvedCandidates(
  candidateTitles: string[],
  excludedAppId: string
): Promise<ResolvedCandidate[]> {
  const resolvedSnapshots = await resolveCandidates(candidateTitles, excludedAppId);

  if (resolvedSnapshots.length === 0) {
    return [];
  }

  if (resolvedSnapshots.length < MAX_FINAL_COMPARABLES) {
    return resolvedSnapshots.map((snapshot) => ({
      ...snapshot,
      profile: buildFallbackStructuredProfile(snapshot),
    }));
  }

  const profileExtractionStartedAt = performance.now();
  const profiles = await extractStructuredProfiles(
    resolvedSnapshots,
    "We couldn't build resolved candidate profiles right now.",
    MAX_CANDIDATE_ABOUT_TEXT_LENGTH
  );

  logCompetitorPriceComparisonTiming(
    "resolved-candidate-profile-extraction",
    profileExtractionStartedAt,
    {
      resolvedCount: resolvedSnapshots.length,
    }
  );

  return resolvedSnapshots.map((snapshot, index) => ({
    ...snapshot,
    profile: profiles[index] ?? buildFallbackStructuredProfile(snapshot),
  }));
}

function normalizeToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function normalizeSignal(value: string) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenizeSignal(value: string) {
  return uniqueStrings(
    normalizeSignal(value)
      .split(" ")
      .map((token) => normalizeToken(token))
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}

function chooseMatchedDetail(sourceValue: string, candidateValue: string) {
  const normalizedSource = normalizeSignal(sourceValue);
  const normalizedCandidate = normalizeSignal(candidateValue);

  if (normalizedSource === normalizedCandidate) {
    return sourceValue;
  }

  if (normalizedSource.includes(normalizedCandidate)) {
    return candidateValue;
  }

  if (normalizedCandidate.includes(normalizedSource)) {
    return sourceValue;
  }

  return sourceValue.length <= candidateValue.length ? sourceValue : candidateValue;
}

function phraseSimilarity(sourceValue: string, candidateValue: string) {
  const normalizedSource = normalizeSignal(sourceValue);
  const normalizedCandidate = normalizeSignal(candidateValue);

  if (!normalizedSource || !normalizedCandidate) {
    return 0;
  }

  if (normalizedSource === normalizedCandidate) {
    return 1;
  }

  const sourceTokens = tokenizeSignal(sourceValue);
  const candidateTokens = tokenizeSignal(candidateValue);

  if (sourceTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const sourceTokenSet = new Set(sourceTokens);
  const candidateTokenSet = new Set(candidateTokens);
  const sharedTokens = sourceTokens.filter((token) => candidateTokenSet.has(token));

  if (sharedTokens.length === 0) {
    return 0;
  }

  if (
    (normalizedSource.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedSource)) &&
    sharedTokens.length >= Math.min(sourceTokens.length, candidateTokens.length)
  ) {
    return 0.92;
  }

  const coverage = sharedTokens.length / Math.min(sourceTokenSet.size, candidateTokenSet.size);
  const unionSize = new Set([...sourceTokenSet, ...candidateTokenSet]).size;
  const jaccard = unionSize > 0 ? sharedTokens.length / unionSize : 0;

  return Math.min(1, coverage * 0.7 + jaccard * 0.3);
}

type PhraseMatch = {
  sourceValue: string;
  candidateValue: string;
  similarity: number;
  detail: string;
};

function collectPhraseMatches(sourceValues: string[], candidateValues: string[]) {
  const uniqueSourceValues = uniqueStrings(sourceValues);
  const uniqueCandidateValues = uniqueStrings(candidateValues);
  const matches: PhraseMatch[] = [];

  for (const sourceValue of uniqueSourceValues) {
    for (const candidateValue of uniqueCandidateValues) {
      const similarity = phraseSimilarity(sourceValue, candidateValue);

      if (similarity < 0.5) {
        continue;
      }

      matches.push({
        sourceValue,
        candidateValue,
        similarity,
        detail: chooseMatchedDetail(sourceValue, candidateValue),
      });
    }
  }

  const usedSource = new Set<string>();
  const usedCandidate = new Set<string>();
  const chosenMatches: PhraseMatch[] = [];

  for (const match of matches.sort((left, right) => right.similarity - left.similarity)) {
    const sourceKey = normalizeSignal(match.sourceValue);
    const candidateKey = normalizeSignal(match.candidateValue);

    if (usedSource.has(sourceKey) || usedCandidate.has(candidateKey)) {
      continue;
    }

    usedSource.add(sourceKey);
    usedCandidate.add(candidateKey);
    chosenMatches.push(match);
  }

  return chosenMatches;
}

function emptyAxisScores(): CandidateAxisScores {
  return {
    coreLoop: 0,
    playerFantasy: 0,
    genreSubgenre: 0,
    pacingPressure: 0,
    decisionStructure: 0,
    tone: 0,
    setting: 0,
    commercialRelevance: 0,
  };
}

function emptyMatchedDetails(): CandidateMatchedDetails {
  return {
    coreLoop: "",
    playerFantasy: "",
    genreSubgenre: "",
    pacingPressure: "",
    decisionStructure: "",
    tone: "",
    setting: "",
    commercialRelevance: "",
  };
}

function scoreAxisMatches(sourceValues: string[], candidateValues: string[], maxScore: number): AxisScoreResult {
  const matches = collectPhraseMatches(sourceValues, candidateValues);

  if (matches.length === 0) {
    return {
      score: 0,
      details: [],
      detail: "",
    };
  }

  const bestSimilarity = matches[0]?.similarity ?? 0;
  const secondSimilarity = matches[1]?.similarity ?? 0;
  const sourceCoverageTarget = Math.max(1, Math.min(2, uniqueStrings(sourceValues).length));
  const coverage = Math.min(1, matches.length / sourceCoverageTarget);
  const quality = Math.min(
    1,
    bestSimilarity * 0.85 + secondSimilarity * 0.15 + Math.min(0.08, (matches.length - 1) * 0.04)
  );
  const weightedQuality = quality * (0.9 + coverage * 0.1);

  let score = Math.round(maxScore * weightedQuality);

  if (bestSimilarity >= 0.9) {
    score = Math.max(score, Math.max(1, Math.round(maxScore * 0.7)));
  } else if (bestSimilarity >= 0.78) {
    score = Math.max(score, Math.max(1, Math.round(maxScore * 0.55)));
  } else if (bestSimilarity >= 0.62) {
    score = Math.max(score, Math.max(1, Math.round(maxScore * 0.4)));
  } else {
    score = Math.max(score, 1);
  }

  const details = uniqueStrings(matches.map((match) => match.detail)).slice(0, 2);

  return {
    score: Math.min(maxScore, score),
    details,
    detail: details.join(", "),
  };
}

function scoreCommercialRelevance(
  sourceProfile: StructuredGameProfile,
  candidateProfile: StructuredGameProfile
): AxisScoreResult {
  const baseResult = scoreAxisMatches(
    sourceProfile.commercialRelevance,
    candidateProfile.commercialRelevance,
    2
  );
  const details = [...baseResult.details];
  let score = Math.min(2, baseResult.score);

  const sourcePrice = parseComparablePrice(sourceProfile.comparisonPrice);
  const candidatePrice = parseComparablePrice(candidateProfile.comparisonPrice);

  if (sourcePrice !== null && candidatePrice !== null) {
    const highPrice = Math.max(sourcePrice, candidatePrice);
    const lowPrice = Math.min(sourcePrice, candidatePrice);
    const ratio = highPrice / lowPrice;

    if (ratio <= 1.15) {
      score += 1;
      details.push("nearby list-price band");
    } else if (ratio <= 1.35) {
      score += 1;
      details.push("adjacent list-price band");
    }
  }

  if (
    score < SCORE_AXIS_MAXIMA.commercialRelevance &&
    sourceProfile.productionTier !== "unknown" &&
    sourceProfile.productionTier === candidateProfile.productionTier
  ) {
    score += 1;
    details.push(`${sourceProfile.productionTier} production tier`);
  }

  const uniqueDetails = uniqueStrings(details).slice(0, 2);

  return {
    score: Math.min(SCORE_AXIS_MAXIMA.commercialRelevance, score),
    details: uniqueDetails,
    detail: uniqueDetails.join(", "),
  };
}

function fitLabelForScore(score: number): FitLabel {
  if (score >= 23) {
    return "Strong";
  }

  if (score >= 16) {
    return "Medium";
  }

  return "Weak";
}

function buildComparableReason(
  axisScores: CandidateAxisScores,
  matchedDetails: CandidateMatchedDetails,
  score: number
) {
  const fragments = SCORE_AXIS_ORDER
    .map((axis, index) => ({
      axis,
      index,
      score: axisScores[axis],
      detail: matchedDetails[axis],
    }))
    .filter((entry) => entry.score > 0 && entry.detail)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.detail);
  const uniqueFragments = uniqueStrings(fragments).slice(0, 3);

  if (uniqueFragments.length === 0) {
    return score <= 15
      ? "Very limited overlap on captured gameplay and commercial factors"
      : "Captured overlap is too sparse to explain cleanly";
  }

  if (score <= 15) {
    return `Limited overlap on ${uniqueFragments.join("; ")}`;
  }

  return uniqueFragments.join("; ");
}

function scoreCandidate(
  sourceProfile: StructuredGameProfile,
  candidate: ResolvedCandidate
): ScoredCandidate {
  const genreResult = scoreAxisMatches(
    uniqueStrings([...sourceProfile.genreSubgenre, ...sourceProfile.genres]),
    uniqueStrings([...candidate.profile.genreSubgenre, ...candidate.profile.genres]),
    SCORE_AXIS_MAXIMA.genreSubgenre
  );
  const axisResults: Record<ScoreAxis, AxisScoreResult> = {
    coreLoop: scoreAxisMatches(
      sourceProfile.coreGameplayLoop,
      candidate.profile.coreGameplayLoop,
      SCORE_AXIS_MAXIMA.coreLoop
    ),
    playerFantasy: scoreAxisMatches(
      sourceProfile.playerFantasy,
      candidate.profile.playerFantasy,
      SCORE_AXIS_MAXIMA.playerFantasy
    ),
    genreSubgenre: genreResult,
    pacingPressure: scoreAxisMatches(
      sourceProfile.pacingPressure,
      candidate.profile.pacingPressure,
      SCORE_AXIS_MAXIMA.pacingPressure
    ),
    decisionStructure: scoreAxisMatches(
      sourceProfile.decisionStructure,
      candidate.profile.decisionStructure,
      SCORE_AXIS_MAXIMA.decisionStructure
    ),
    tone: scoreAxisMatches(
      sourceProfile.tone,
      candidate.profile.tone,
      SCORE_AXIS_MAXIMA.tone
    ),
    setting: scoreAxisMatches(
      sourceProfile.setting,
      candidate.profile.setting,
      SCORE_AXIS_MAXIMA.setting
    ),
    commercialRelevance: scoreCommercialRelevance(sourceProfile, candidate.profile),
  };

  const axisScores = emptyAxisScores();
  const matchedDetails = emptyMatchedDetails();

  for (const axis of SCORE_AXIS_ORDER) {
    axisScores[axis] = axisResults[axis].score;
    matchedDetails[axis] = axisResults[axis].detail;
  }

  const score = SCORE_AXIS_ORDER.reduce((sum, axis) => sum + axisScores[axis], 0);
  const fitLabel = fitLabelForScore(score);
  const reason = buildComparableReason(axisScores, matchedDetails, score);

  return {
    ...candidate,
    score,
    fitLabel,
    reason,
    axisScores,
    matchedDetails,
    priceKnown: parseComparablePrice(candidate.comparisonPrice) !== null,
    selected: false,
  };
}

function scoreResolvedCandidates(
  sourceProfile: StructuredGameProfile,
  candidates: ResolvedCandidate[]
): ScoredCandidate[] {
  return candidates
    .map((candidate) => scoreCandidate(sourceProfile, candidate))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.priceKnown !== left.priceKnown) {
        return Number(right.priceKnown) - Number(left.priceKnown);
      }

      return left.title.localeCompare(right.title);
    });
}

function countFitLabels(finalComparables: ScoredCandidate[]): FinalFitCounts {
  return finalComparables.reduce(
    (counts, comparable) => {
      if (comparable.fitLabel === "Strong") {
        counts.strong += 1;
      } else if (comparable.fitLabel === "Medium") {
        counts.medium += 1;
      } else {
        counts.weak += 1;
      }

      return counts;
    },
    { strong: 0, medium: 0, weak: 0 }
  );
}

function selectFinalComparables(candidates: ScoredCandidate[]) {
  const selectedAppIds = new Set<string>();
  const finalComparables = candidates.slice(0, MAX_FINAL_COMPARABLES).map((candidate) => ({
    ...candidate,
    selected: true,
  }));

  for (const comparable of finalComparables) {
    selectedAppIds.add(comparable.appId);
  }

  return {
    finalComparables,
    selectedAppIds,
  };
}

function decideConfidence(finalComparables: ScoredCandidate[]): ConfidenceDecision {
  const finalFitCounts = countFitLabels(finalComparables);
  const strongCount = finalFitCounts.strong;
  const mediumCount = finalFitCounts.medium;
  const thirdComparable = finalComparables[2] ?? null;

  if (!thirdComparable) {
    return {
      confidence: "low",
      confidenceReason: "Not enough reranked comparables were available to evaluate the direct comparable gate.",
      confidenceGatePassed: false,
      gateReason: "Fewer than three reranked comparables were available after reranking.",
      finalFitCounts,
    };
  }

  if (thirdComparable.fitLabel === "Weak") {
    return {
      confidence: "low",
      confidenceReason:
        "The final comparison set falls below the minimum fit threshold because the third comparable is Weak.",
      confidenceGatePassed: false,
      gateReason: "The third-best comparable scored Weak, so pricing was withheld.",
      finalFitCounts,
    };
  }

  // Pricing is only returned when all three comparables are Medium-or-better and at least one is Strong.
  if (strongCount === 2 && mediumCount === 1) {
    return {
      confidence: "high",
      confidenceReason: "The final set cleared the pricing gate with 2 Strong fits and 1 Medium fit.",
      confidenceGatePassed: true,
      gateReason: "2 Strong + 1 Medium",
      finalFitCounts,
    };
  }

  if (strongCount === 1 && mediumCount === 2) {
    return {
      confidence: "high",
      confidenceReason: "The final set cleared the pricing gate with 1 Strong fit and 2 Medium fits.",
      confidenceGatePassed: true,
      gateReason: "1 Strong + 2 Medium",
      finalFitCounts,
    };
  }

  if (strongCount === 3) {
    return {
      confidence: "high",
      confidenceReason: "The final set cleared the pricing gate with 3 Strong fits.",
      confidenceGatePassed: true,
      gateReason: "3 Strong",
      finalFitCounts,
    };
  }

  return {
    confidence: "low",
    confidenceReason:
      "The final set is not strong enough to produce a trustworthy pricing recommendation yet.",
    confidenceGatePassed: false,
    gateReason: "The final three did not meet the minimum Strong-plus-Medium gate.",
    finalFitCounts,
  };
}

function fitWeight(fitLabel: FitLabel) {
  switch (fitLabel) {
    case "Strong":
      return 1.45;
    case "Medium":
      return 1.0;
    case "Weak":
      return 0.55;
    default:
      return 0.5;
  }
}

function pickPriceFromLadder(value: number, direction: "down" | "nearest" | "up") {
  if (!Number.isFinite(value) || value <= 0) {
    return PRICE_LADDER[0];
  }

  if (direction === "down") {
    const match = [...PRICE_LADDER].reverse().find((pricePoint) => pricePoint <= value);
    return match ?? PRICE_LADDER[0];
  }

  if (direction === "up") {
    const match = PRICE_LADDER.find((pricePoint) => pricePoint >= value);
    return match ?? PRICE_LADDER[PRICE_LADDER.length - 1];
  }

  return PRICE_LADDER.reduce((closestPrice, candidatePrice) => {
    const candidateDistance = Math.abs(candidatePrice - value);
    const closestDistance = Math.abs(closestPrice - value);
    return candidateDistance < closestDistance ? candidatePrice : closestPrice;
  });
}

function roundToDot99(value: number, direction: "down" | "nearest" | "up") {
  if (!Number.isFinite(value) || value <= 0) {
    return 0.99;
  }

  const wholePart = Math.floor(value);
  const downCandidate =
    wholePart + 0.99 <= value ? wholePart + 0.99 : Math.max(0.99, wholePart - 1 + 0.99);
  const upCandidate = wholePart + 0.99 >= value ? wholePart + 0.99 : wholePart + 1 + 0.99;

  if (direction === "down") {
    return Number(downCandidate.toFixed(2));
  }

  if (direction === "up") {
    return Number(upCandidate.toFixed(2));
  }

  return Math.abs(value - downCandidate) <= Math.abs(upCandidate - value)
    ? Number(downCandidate.toFixed(2))
    : Number(upCandidate.toFixed(2));
}

function roundToSteamFriendlyPrice(value: number, direction: "down" | "nearest" | "up") {
  if (!Number.isFinite(value) || value <= 0) {
    return PRICE_LADDER[0];
  }

  const ladderMin = PRICE_LADDER[0];
  const ladderMax = PRICE_LADDER[PRICE_LADDER.length - 1];

  if (value >= ladderMin && value <= ladderMax) {
    return pickPriceFromLadder(value, direction);
  }

  return roundToDot99(value, direction);
}

function interpolateQuantile(sortedValues: number[], quantile: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const clampedQuantile = Math.max(0, Math.min(1, quantile));
  const position = (sortedValues.length - 1) * clampedQuantile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const lowerValue = sortedValues[lowerIndex] ?? sortedValues[0];
  const upperValue = sortedValues[upperIndex] ?? sortedValues[sortedValues.length - 1];
  const ratio = position - lowerIndex;

  return lowerValue + (upperValue - lowerValue) * ratio;
}

function weightedQuantile(
  entries: Array<{ numericPrice: number; fallbackWeight: number }>,
  quantile: number
) {
  if (entries.length === 0) {
    return 0;
  }

  const sortedEntries = [...entries].sort((left, right) => left.numericPrice - right.numericPrice);
  const totalWeight = sortedEntries.reduce((sum, entry) => sum + entry.fallbackWeight, 0);

  if (totalWeight <= 0) {
    return sortedEntries[Math.floor(sortedEntries.length / 2)]?.numericPrice ?? 0;
  }

  const clampedQuantile = Math.max(0, Math.min(1, quantile));
  const threshold = totalWeight * clampedQuantile;

  if (threshold <= 0) {
    return sortedEntries[0]?.numericPrice ?? 0;
  }

  let cumulativeWeight = 0;

  for (const entry of sortedEntries) {
    cumulativeWeight += entry.fallbackWeight;

    if (cumulativeWeight >= threshold) {
      return entry.numericPrice;
    }
  }

  return sortedEntries[sortedEntries.length - 1]?.numericPrice ?? 0;
}

function normalizeSuggestedPriceRange(
  minPrice: number,
  maxPrice: number,
  recommendedPrice: number
) {
  let suggestedRangeMin = roundToSteamFriendlyPrice(minPrice, "down");
  let suggestedRangeMax = roundToSteamFriendlyPrice(maxPrice, "up");
  let normalizedRecommendedPrice = roundToSteamFriendlyPrice(recommendedPrice, "nearest");

  if (suggestedRangeMin > normalizedRecommendedPrice) {
    suggestedRangeMin = roundToSteamFriendlyPrice(normalizedRecommendedPrice, "down");
  }

  if (suggestedRangeMax < normalizedRecommendedPrice) {
    suggestedRangeMax = roundToSteamFriendlyPrice(normalizedRecommendedPrice, "up");
  }

  if (suggestedRangeMin === suggestedRangeMax) {
    suggestedRangeMin = roundToSteamFriendlyPrice(normalizedRecommendedPrice - 2, "down");
    suggestedRangeMax = roundToSteamFriendlyPrice(normalizedRecommendedPrice + 2, "up");
  }

  if (normalizedRecommendedPrice < suggestedRangeMin) {
    normalizedRecommendedPrice = suggestedRangeMin;
  }

  if (normalizedRecommendedPrice > suggestedRangeMax) {
    normalizedRecommendedPrice = suggestedRangeMax;
  }

  return {
    suggestedRangeMin,
    suggestedRangeMax,
    recommendedPrice: normalizedRecommendedPrice,
  };
}

function buildComparableBackedPricingSuggestion(finalComparables: ScoredCandidate[]) {
  if (!finalComparables.every((candidate) => candidate.priceKnown)) {
    return null;
  }

  return buildPricingSuggestion(
    finalComparables.map((candidate) => ({
      title: candidate.title,
      currentPrice: candidate.comparisonPrice,
      reason: candidate.reason,
      fitLabel: candidate.fitLabel,
    }))
  );
}

function selectFallbackPricingPool(scoredCandidates: ScoredCandidate[]): PricedScoredCandidate[] {
  const pricedCandidates = scoredCandidates
    .map((candidate) => {
      const numericPrice = parseComparablePrice(candidate.comparisonPrice);

      if (numericPrice === null) {
        return null;
      }

      return {
        ...candidate,
        numericPrice,
        fallbackWeight: Math.max(candidate.score, 1),
      };
    })
    .filter((candidate): candidate is PricedScoredCandidate => Boolean(candidate));

  if (pricedCandidates.length === 0) {
    return [];
  }

  let fallbackPool = pricedCandidates.filter((candidate) => candidate.score >= 10);

  if (fallbackPool.length < 4) {
    const desiredPoolSize = pricedCandidates.length >= 5 ? Math.min(8, pricedCandidates.length) : pricedCandidates.length;
    fallbackPool = pricedCandidates.slice(0, desiredPoolSize);
  }

  if (fallbackPool.length < 5) {
    return fallbackPool;
  }

  const sortedPrices = fallbackPool
    .map((candidate) => candidate.numericPrice)
    .sort((left, right) => left - right);
  const firstQuartile = interpolateQuantile(sortedPrices, 0.25);
  const thirdQuartile = interpolateQuantile(sortedPrices, 0.75);
  const interquartileRange = thirdQuartile - firstQuartile;
  const outlierMargin = Math.max(4, interquartileRange * 1.5);
  const lowerFence = Math.max(0.99, firstQuartile - outlierMargin);
  const upperFence = thirdQuartile + outlierMargin;
  const filteredPool = fallbackPool.filter(
    (candidate) =>
      candidate.numericPrice >= lowerFence && candidate.numericPrice <= upperFence
  );

  return filteredPool.length >= 3 ? filteredPool : fallbackPool;
}

function deriveFallbackPricingConfidence(fallbackPool: PricedScoredCandidate[]): PricingConfidenceLabel {
  if (fallbackPool.length === 0) {
    return "low";
  }

  const averageScore =
    fallbackPool.reduce((sum, candidate) => sum + candidate.score, 0) / fallbackPool.length;
  const mediumOrBetterCount = fallbackPool.filter((candidate) => candidate.score >= 16).length;

  if (fallbackPool.length >= 5 && averageScore >= 14 && mediumOrBetterCount >= 3) {
    return "medium";
  }

  return "low";
}

function buildFallbackPricingSuggestion(
  scoredCandidates: ScoredCandidate[],
  fallbackReason: string
) {
  const fallbackPool = selectFallbackPricingPool(scoredCandidates);

  if (fallbackPool.length < 2) {
    return null;
  }

  const weightedCenterPrice = weightedQuantile(fallbackPool, 0.5);
  const lowerQuartilePrice = weightedQuantile(fallbackPool, 0.25);
  const upperQuartilePrice = weightedQuantile(fallbackPool, 0.75);
  const normalizedRange = normalizeSuggestedPriceRange(
    lowerQuartilePrice,
    upperQuartilePrice,
    weightedCenterPrice
  );
  const fallbackPoolSummary = fallbackPool
    .slice(0, 6)
    .map(
      (candidate) =>
        `${candidate.title} (${candidate.score}/30) at ${formatUsdPrice(candidate.numericPrice)}`
    )
    .join(", ");
  const pricingExplanation = [
    fallbackReason,
    `This lower-confidence estimate uses a broader adjacent market pool weighted by fit score and list-price position: ${fallbackPoolSummary}.`,
    `The launch price is anchored to the weighted median, with the weighted 25th and 75th percentile defining the suggested range.`,
  ].join(" ");

  return {
    suggested_price_range_min: formatUsdPrice(normalizedRange.suggestedRangeMin),
    suggested_price_range_max: formatUsdPrice(normalizedRange.suggestedRangeMax),
    recommended_price: formatUsdPrice(normalizedRange.recommendedPrice),
    pricing_rationale: pricingExplanation,
    pricingConfidence: deriveFallbackPricingConfidence(fallbackPool),
    fallbackPool,
    pricingExplanation,
  };
}

function buildPricingSuggestion(comparables: ComparableGameResult[]): PricingSuggestion {
  const pricedComparables = comparables
    .map((comparable) => ({
      ...comparable,
      numericPrice: parseComparablePrice(comparable.currentPrice),
      weight: fitWeight(comparable.fitLabel),
    }))
    .filter(
      (
        comparable
      ): comparable is ComparableGameResult & { numericPrice: number; weight: number } =>
        comparable.numericPrice !== null
    );

  if (pricedComparables.length === 0) {
    throw new Error("We couldn't build a price suggestion from the returned comparable prices.");
  }

  const sortedByPrice = [...pricedComparables].sort((left, right) => left.numericPrice - right.numericPrice);
  const rawPrices = sortedByPrice.map((entry) => entry.numericPrice);
  const medianPrice = rawPrices[Math.floor(rawPrices.length / 2)] ?? rawPrices[0];
  const maxPrice = rawPrices[rawPrices.length - 1];
  const secondHighestPrice = rawPrices.length > 1 ? rawPrices[rawPrices.length - 2] : maxPrice;

  const adjustedComparables = sortedByPrice.map((entry) => {
    let adjustedPrice = entry.numericPrice;
    let adjustedWeight = entry.weight;

    if (
      rawPrices.length >= 3 &&
      entry.numericPrice === maxPrice &&
      maxPrice >= medianPrice * 1.4 &&
      maxPrice - secondHighestPrice >= 4 &&
      entry.fitLabel !== "Strong"
    ) {
      adjustedPrice = medianPrice + (maxPrice - medianPrice) * 0.3;
      adjustedWeight = adjustedWeight * 0.6;
    }

    return {
      ...entry,
      adjustedPrice,
      adjustedWeight,
    };
  });

  const adjustedPrices = adjustedComparables
    .map((entry) => entry.adjustedPrice)
    .sort((left, right) => left - right);
  const adjustedMinPrice = adjustedPrices[0] ?? rawPrices[0];
  const adjustedMaxPrice = adjustedPrices[adjustedPrices.length - 1] ?? maxPrice;
  const totalWeight = adjustedComparables.reduce((sum, entry) => sum + entry.adjustedWeight, 0);
  const weightedAverage =
    adjustedComparables.reduce((sum, entry) => sum + entry.adjustedPrice * entry.adjustedWeight, 0) /
    totalWeight;
  const expandedWeightedPrices = adjustedComparables
    .flatMap((entry) => {
      const repeatCount = Math.max(1, Math.round(entry.adjustedWeight * 4));
      return Array.from({ length: repeatCount }, () => entry.adjustedPrice);
    })
    .sort((left, right) => left - right);
  const weightedMedian =
    expandedWeightedPrices[Math.floor(expandedWeightedPrices.length / 2)] ?? weightedAverage;
  const rawRecommended = weightedMedian * 0.6 + weightedAverage * 0.4;
  let recommendedPrice = pickPriceFromLadder(rawRecommended, "nearest");
  let suggestedRangeMin = pickPriceFromLadder(
    Math.max(adjustedMinPrice, Math.min(weightedMedian, weightedAverage)),
    "down"
  );
  let suggestedRangeMax = pickPriceFromLadder(
    Math.min(adjustedMaxPrice, Math.max(weightedMedian, weightedAverage)),
    "up"
  );

  const recommendedIndex = PRICE_LADDER.indexOf(recommendedPrice);

  if (recommendedIndex >= 0) {
    const lowerBound = PRICE_LADDER[Math.max(0, recommendedIndex - 1)];
    const upperBound = PRICE_LADDER[Math.min(PRICE_LADDER.length - 1, recommendedIndex + 1)];

    if (suggestedRangeMin < lowerBound) {
      suggestedRangeMin = lowerBound;
    }

    if (suggestedRangeMax > upperBound) {
      suggestedRangeMax = upperBound;
    }
  }

  if (suggestedRangeMin >= suggestedRangeMax) {
    const fallbackIndex = Math.max(0, PRICE_LADDER.indexOf(recommendedPrice));
    suggestedRangeMin = PRICE_LADDER[Math.max(0, fallbackIndex - 1)];
    suggestedRangeMax = PRICE_LADDER[Math.min(PRICE_LADDER.length - 1, fallbackIndex + 1)];
  }

  if (recommendedPrice < suggestedRangeMin) {
    recommendedPrice = suggestedRangeMin;
  }

  if (recommendedPrice > suggestedRangeMax) {
    recommendedPrice = suggestedRangeMax;
  }

  const outlierSoftened = adjustedComparables.some(
    (entry) => Math.abs(entry.numericPrice - entry.adjustedPrice) >= 1
  );
  const comparablePriceSummary = pricedComparables
    .map(
      (entry) =>
        `${entry.title} (${entry.fitLabel} fit) at ${formatUsdPrice(entry.numericPrice)}`
    )
    .join(", ");
  const pricingRationale = [
    `List prices used: ${comparablePriceSummary}.`,
    "Strong fits were weighted more heavily than Medium fits.",
    outlierSoftened
      ? "One obvious higher-price outlier was softened so it would not pull the recommendation too high."
      : "No high-price outlier adjustment was needed.",
    `That keeps the suggested range at ${formatUsdPrice(suggestedRangeMin)} to ${formatUsdPrice(suggestedRangeMax)}, with ${formatUsdPrice(recommendedPrice)} as the recommended launch price.`,
  ].join(" ");

  return {
    suggested_price_range_min: formatUsdPrice(suggestedRangeMin),
    suggested_price_range_max: formatUsdPrice(suggestedRangeMax),
    recommended_price: formatUsdPrice(recommendedPrice),
    pricing_rationale: pricingRationale,
  };
}

function buildResolvedCandidateResponses(
  scoredCandidates: ScoredCandidate[],
  selectedAppIds: Set<string>
): ResolvedCandidateResponse[] {
  return scoredCandidates.map((candidate) => ({
    title: candidate.title,
    current_price: candidate.comparisonPrice,
    current_store_price: candidate.currentStorePrice,
    original_list_price: candidate.originalListPrice,
    comparison_price: candidate.comparisonPrice,
    score: candidate.score,
    fitLabel: candidate.fitLabel,
    reason: candidate.reason,
    axis_scores: candidate.axisScores,
    matched_factors: candidate.matchedDetails,
    selected: selectedAppIds.has(candidate.appId),
    profile: candidate.profile,
  }));
}

export async function POST(request: NextRequest) {
  const routeStartedAt = performance.now();
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonError("Server is missing OPENAI_API_KEY.", 500);
  }

  const accessToken = getSupabaseAccessTokenFromAuthorizationHeader(
    request.headers.get("authorization")
  );

  let body: CompetitorPriceComparisonRequest;

  try {
    body = (await request.json()) as CompetitorPriceComparisonRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const steamUrl = typeof body.url === "string" ? body.url.trim() : "";

  if (!steamUrl) {
    return jsonError("A Steam URL is required.", 400);
  }

  const creditsGateStartedAt = performance.now();
  const creditsGate = await requireCompetitorPriceComparisonCredits({
    source: "competitor-price-comparison/route",
    accessToken,
  });
  logCompetitorPriceComparisonTiming("auth-credit-gate", creditsGateStartedAt, {
    ok: creditsGate.ok,
    status: creditsGate.ok ? 200 : creditsGate.status,
  });

  if (!creditsGate.ok) {
    return jsonError(creditsGate.error, creditsGate.status);
  }

  try {
    const steamFetchStartedAt = performance.now();
    const storeData = await fetchSteamStoreData(steamUrl);
    logCompetitorPriceComparisonTiming("steam-page-fetch", steamFetchStartedAt, {
      appId: storeData.appId,
    });

    const sourceProfileStartedAt = performance.now();
    const sourceProfile = await buildSourceProfile(storeData);
    logCompetitorPriceComparisonTiming("source-profile-extraction", sourceProfileStartedAt, {
      sourceTitle: storeData.title,
    });

    const candidateGenerationStartedAt = performance.now();
    const candidateTitles = await requestCandidateTitles(storeData, sourceProfile);
    logCompetitorPriceComparisonTiming("candidate-generation", candidateGenerationStartedAt, {
      candidateCount: candidateTitles.length,
    });

    const resolvedCandidatesStartedAt = performance.now();
    const resolvedCandidates = await buildResolvedCandidates(candidateTitles, storeData.appId);
    logCompetitorPriceComparisonTiming("resolved-candidate-build", resolvedCandidatesStartedAt, {
      resolvedCount: resolvedCandidates.length,
    });

    if (resolvedCandidates.length < MAX_FINAL_COMPARABLES) {
      return jsonError(
        "We couldn't resolve enough comparable games with current prices right now.",
        502
      );
    }

    const scoringStartedAt = performance.now();
    const scoredCandidates = scoreResolvedCandidates(sourceProfile, resolvedCandidates);
    const { finalComparables, selectedAppIds } = selectFinalComparables(scoredCandidates);
    logCompetitorPriceComparisonTiming("reranking-scoring", scoringStartedAt, {
      scoredCount: scoredCandidates.length,
      finalCount: finalComparables.length,
    });

    if (finalComparables.length !== MAX_FINAL_COMPARABLES) {
      return jsonError(
        "We couldn't resolve three comparable games right now.",
        502
      );
    }

    const confidenceDecision = decideConfidence(finalComparables);
    const comparables: ComparableGameResult[] = finalComparables.map((candidate) => ({
      title: candidate.title,
      currentPrice: candidate.comparisonPrice,
      reason: candidate.reason,
      fitLabel: candidate.fitLabel,
    }));

    const pricingStartedAt = performance.now();
    const comparableBackedPricing = confidenceDecision.confidenceGatePassed
      ? buildComparableBackedPricingSuggestion(finalComparables)
      : null;
    const fallbackReason = confidenceDecision.confidenceGatePassed
      ? "The final comparables cleared the fit gate, but direct comp-backed pricing could not rely on complete final-3 list-price data, so the route used the broader scored market pool instead."
      : "Direct comparables were too weak for a high-confidence comp-backed price, so this recommendation uses a broader adjacent market pool weighted by fit score and list-price position.";
    const fallbackPricing =
      comparableBackedPricing === null
        ? buildFallbackPricingSuggestion(scoredCandidates, fallbackReason)
        : null;
    const pricingMode: PricingMode = comparableBackedPricing ? "comparable_backed" : "fallback_market_estimate";
    const pricingConfidence: PricingConfidenceLabel = comparableBackedPricing
      ? "high"
      : fallbackPricing?.pricingConfidence ?? "low";
    const pricingAvailable = Boolean(comparableBackedPricing || fallbackPricing);
    const pricingSuggestion = comparableBackedPricing ?? fallbackPricing;
    const pricingExplanation = pricingSuggestion
      ? pricingSuggestion.pricing_rationale
      : "Insufficient priced candidate data remained after resolution to build either a comparable-backed or fallback market estimate.";
    const recommendedPrice = pricingSuggestion?.recommended_price ?? "";
    const suggestedRangeMin = pricingSuggestion?.suggested_price_range_min ?? "";
    const suggestedRangeMax = pricingSuggestion?.suggested_price_range_max ?? "";
    const hasUsablePricingOutput = Boolean(
      pricingSuggestion && recommendedPrice && suggestedRangeMin && suggestedRangeMax
    );
    logCompetitorPriceComparisonTiming("pricing-calculation", pricingStartedAt, {
      pricingMode,
      pricingAvailable,
      hasUsablePricingOutput,
    });
    const responseBody: CompetitorPriceComparisonResponse = {
      sourceGameTitle: storeData.title,
      comparables,
      disclaimer: DISCLAIMER,
      confidence: confidenceDecision.confidence,
      confidence_reason: confidenceDecision.confidenceReason,
      suggested_price_range_min: suggestedRangeMin,
      suggested_price_range_max: suggestedRangeMax,
      recommended_price: recommendedPrice,
      pricing_rationale: pricingExplanation,
      pricing_allowed: pricingAvailable,
      pricing_gate_reason: confidenceDecision.gateReason,
      pricingMode,
      pricingConfidence,
      recommendedLaunchPrice: recommendedPrice,
      suggestedPriceRange: {
        min: suggestedRangeMin,
        max: suggestedRangeMax,
      },
      pricingExplanation,
      confidenceGatePassed: confidenceDecision.confidenceGatePassed,
      finalFitCounts: confidenceDecision.finalFitCounts,
      source_profile: sourceProfile,
      resolved_candidates: buildResolvedCandidateResponses(scoredCandidates, selectedAppIds),
    };

    if (hasUsablePricingOutput) {
      const creditDeductionStartedAt = performance.now();
      const deductionResult = await deductCompetitorPriceComparisonCredit(
        creditsGate.userId,
        creditsGate.balance,
        {
          source: "competitor-price-comparison/route",
          accessToken,
        }
      );
      logCompetitorPriceComparisonTiming("credit-deduction", creditDeductionStartedAt, {
        ok: deductionResult.ok,
        status: deductionResult.ok ? 200 : deductionResult.status,
      });

      if (!deductionResult.ok) {
        return jsonError(
          deductionResult.error,
          deductionResult.status,
          deductionResult.status === 409
            ? "COMPETITOR_CREDIT_RACE"
            : "COMPETITOR_CREDIT_DEDUCTION_FAILED"
        );
      }

      responseBody.remainingCredits = deductionResult.remainingBalance;
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return jsonError("We couldn't read that Steam page right now.", 502);
    }

    if (error instanceof Error && error.message.trim()) {
      const message = error.message.trim();

      if (message === "Enter a valid Steam store URL.") {
        return jsonError(message, 400);
      }

      if (
        message === "We couldn't read that Steam page right now." ||
        message === "We couldn't build a useful source profile right now." ||
        message === "We couldn't generate comparable games right now." ||
        message === "We couldn't generate enough useful comparable games right now." ||
        message === "We couldn't build resolved candidate profiles right now." ||
        message === "We couldn't resolve enough comparable games with current prices right now." ||
        message === "We couldn't resolve three comparable games right now." ||
        message === "We couldn't build a price suggestion from the returned comparable prices."
      ) {
        return jsonError(message, 502);
      }

      return jsonError(message, 500);
    }

    return jsonError("We couldn't compare competitor prices right now. Please try again.", 500);
  } finally {
    logCompetitorPriceComparisonTiming("total-route", routeStartedAt);
  }
}