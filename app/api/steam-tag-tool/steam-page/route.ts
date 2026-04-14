import axios from "axios";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import {
  deductSteamTagToolCredit,
  getSupabaseAccessTokenFromAuthorizationHeader,
  requireSteamTagToolCredits,
} from "@/lib/credits";
import { getOpenAIClient } from "@/lib/openai";
import { STEAM_TAGS, filterCanonicalSteamTags, type SteamTag } from "@/lib/steam-tags";

export const runtime = "nodejs";

const MODEL_NAME = "gpt-4o-mini";
const MAX_SUGGESTED_TAGS = 8;
const STEAM_APP_ID_PATTERN = /\/app\/(\d+)/i;
const STEAM_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

type SteamPageModeRequest = {
  url?: string;
};

type SteamPageTagEvaluationPayload = {
  goodTags?: unknown;
  suggestedTags?: unknown;
  weakTags?: unknown;
  reviewTags?: unknown;
  recommendation?: unknown;
};

type SteamStoreData = {
  appId: string;
  title: string;
  capsuleUrl: string;
  shortDescription: string;
  aboutThisGame: string;
  currentTags: string[];
  genres: string[];
  categories: string[];
};

type SteamPageTagEvaluation = {
  goodTags: string[];
  suggestedTags: string[];
  weakTags: string[];
  reviewTags: string[];
  recommendation: string;
};

type SteamPageModeSuccessPayload = {
  appId: string;
  title: string;
  capsuleUrl: string;
  shortDescription: string;
  aboutThisGame: string;
  currentTags: string[];
  goodTags: string[];
  suggestedTags: string[];
  weakTags: string[];
  reviewTags: string[];
  recommendation: string;
  remainingCredits?: number;
};

type SuggestedTagPromotionRule = {
  tag: SteamTag;
  directPhrases?: string[];
  supportPhrases?: string[];
  minimumSupportMatches?: number;
  categoryMatches?: string[];
  genreMatches?: string[];
  coveredBy?: SteamTag[];
};

const SUGGESTED_TAG_PROMOTION_RULES: SuggestedTagPromotionRule[] = [
  {
    tag: "Singleplayer",
    directPhrases: ["single-player", "single player", "singleplayer", "solo campaign", "solo adventure", "solo experience"],
    categoryMatches: ["single-player"],
  },
  {
    tag: "Comedy",
    directPhrases: ["comedy", "comedic", "humor", "humorous"],
    supportPhrases: ["joke", "jokes", "laugh", "laughs", "lighthearted", "witty"],
    minimumSupportMatches: 2,
    coveredBy: ["Dark Comedy"],
  },
  {
    tag: "Funny",
    directPhrases: ["funny"],
    supportPhrases: ["comedy", "comedic", "humor", "humorous", "joke", "jokes", "goofy", "wacky"],
    minimumSupportMatches: 2,
    coveredBy: ["Comedy", "Dark Comedy", "Satire"],
  },
  {
    tag: "Satire",
    directPhrases: ["satire", "satirical"],
    supportPhrases: ["parody", "social commentary", "political commentary", "mockery"],
    minimumSupportMatches: 2,
  },
  {
    tag: "Horror",
    directPhrases: ["horror", "survival horror", "psychological horror"],
    supportPhrases: ["haunted", "terror", "terrifying", "nightmare", "dread", "eldritch"],
    minimumSupportMatches: 2,
    coveredBy: ["Survival Horror", "Psychological Horror"],
  },
  {
    tag: "Mystery",
    directPhrases: ["mystery", "mysterious", "mysteries"],
    supportPhrases: ["investigate", "investigation", "detective", "clues", "uncover", "secret", "secrets"],
    minimumSupportMatches: 2,
    coveredBy: ["Detective"],
  },
  {
    tag: "Atmospheric",
    directPhrases: ["atmospheric"],
    supportPhrases: ["immersive", "moody", "haunting", "eerie", "brooding", "ambient"],
    minimumSupportMatches: 2,
  },
  {
    tag: "Story Rich",
    directPhrases: [
      "story rich",
      "story-rich",
      "story driven",
      "story-driven",
      "narrative driven",
      "narrative-driven",
      "story-focused",
      "narrative adventure",
    ],
    supportPhrases: ["narrative", "dialogue", "branching", "plot", "character-driven", "cinematic", "conversation", "lore-rich"],
    minimumSupportMatches: 2,
    coveredBy: ["Visual Novel", "Interactive Fiction", "Narration", "Dynamic Narration", "Choices Matter", "Multiple Endings"],
  },
  {
    tag: "Choices Matter",
    directPhrases: [
      "choices matter",
      "meaningful choices",
      "choices have consequences",
      "decisions have consequences",
      "branching choices",
    ],
    supportPhrases: ["decision", "decisions", "consequence", "consequences", "branching", "outcome", "outcomes"],
    minimumSupportMatches: 2,
  },
  {
    tag: "Multiple Endings",
    directPhrases: ["multiple endings", "alternate endings", "different endings", "branching endings"],
    supportPhrases: ["ending depends on choices", "endings depend on choices", "multiple outcomes", "different final outcomes"],
    minimumSupportMatches: 1,
  },
  {
    tag: "Psychological Horror",
    directPhrases: ["psychological horror"],
    supportPhrases: ["psychological", "paranoia", "sanity", "hallucination", "hallucinations", "delusion", "dread", "terror"],
    minimumSupportMatches: 3,
  },
  {
    tag: "Walking Simulator",
    directPhrases: ["walking simulator"],
    supportPhrases: ["environmental storytelling", "narrative exploration", "quiet exploration", "slow exploration", "no combat"],
    minimumSupportMatches: 2,
  },
  {
    tag: "Investigation",
    directPhrases: ["investigation", "investigate", "investigating", "investigator"],
    supportPhrases: ["detective", "clues", "suspect", "suspects", "case", "evidence"],
    minimumSupportMatches: 2,
  },
  {
    tag: "Life Sim",
    directPhrases: ["life sim", "life simulation", "slice of life"],
    supportPhrases: ["daily life", "relationships", "routine", "village life", "town life", "decorate your home"],
    minimumSupportMatches: 2,
    coveredBy: ["Farming Sim"],
  },
  {
    tag: "Farming Sim",
    directPhrases: ["farming sim", "farm life"],
    supportPhrases: ["farming", "farm", "crops", "harvest", "livestock", "farm animals", "planting"],
    minimumSupportMatches: 2,
  },
  {
    tag: "Relaxing",
    directPhrases: ["cozy", "cosy", "relaxing", "wholesome"],
    supportPhrases: ["peaceful", "gentle", "laid-back", "chill", "calm"],
    minimumSupportMatches: 2,
  },
];

function normalizeSearchableText(values: string[]): string {
  return values
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean)
    .join("\n");
}

function normalizeTextSet(values: string[]): Set<string> {
  return new Set(values.map((value) => normalizeText(value).toLowerCase()).filter(Boolean));
}

function countPhraseMatches(searchableText: string, phrases: string[]): number {
  return phrases.reduce((total, phrase) => {
    const normalizedPhrase = normalizeText(phrase).toLowerCase();

    return normalizedPhrase && searchableText.includes(normalizedPhrase) ? total + 1 : total;
  }, 0);
}

function inferEvidenceSupportedSuggestedTags(
  storeData: SteamStoreData,
  currentTags: string[],
  modelSuggestedTags: SteamTag[]
): SteamTag[] {
  const searchableEvidence = normalizeSearchableText([
    storeData.title,
    storeData.shortDescription,
    storeData.aboutThisGame,
    ...storeData.genres,
    ...storeData.categories,
  ]);
  const normalizedCurrentTags = normalizeTextSet(currentTags);
  const normalizedSuggestedTags = normalizeTextSet(modelSuggestedTags);
  const normalizedGenres = normalizeTextSet(storeData.genres);
  const normalizedCategories = normalizeTextSet(storeData.categories);
  const inferredTags: SteamTag[] = [];

  for (const rule of SUGGESTED_TAG_PROMOTION_RULES) {
    const coverageTags = [rule.tag, ...(rule.coveredBy ?? [])];
    const isAlreadyCovered = coverageTags.some((tag) => normalizedCurrentTags.has(normalizeText(tag).toLowerCase()));
    const isAlreadySuggested = normalizedSuggestedTags.has(normalizeText(rule.tag).toLowerCase());

    if (isAlreadyCovered || isAlreadySuggested) {
      continue;
    }

    const hasDirectEvidence = countPhraseMatches(searchableEvidence, rule.directPhrases ?? []) > 0;
    const supportMatches = countPhraseMatches(searchableEvidence, rule.supportPhrases ?? []);
    const hasCategoryEvidence = (rule.categoryMatches ?? []).some((value) => normalizedCategories.has(normalizeText(value).toLowerCase()));
    const hasGenreEvidence = (rule.genreMatches ?? []).some((value) => normalizedGenres.has(normalizeText(value).toLowerCase()));
    const minimumSupportMatches = rule.minimumSupportMatches ?? 1;

    if (hasDirectEvidence || hasCategoryEvidence || hasGenreEvidence || supportMatches >= minimumSupportMatches) {
      inferredTags.push(rule.tag);
    }
  }

  return inferredTags;
}

function cleanupSuggestedTags(storeData: SteamStoreData, tags: SteamTag[]): SteamTag[] {
  const searchableEvidence = normalizeSearchableText([
    storeData.title,
    storeData.shortDescription,
    storeData.aboutThisGame,
    ...storeData.genres,
    ...storeData.categories,
  ]);
  const filteredTags = filterCanonicalSteamTags(tags);
  const tagSet = new Set(filteredTags);
  const hasDramaSupport = countPhraseMatches(searchableEvidence, ["drama", "dramatic", "melodrama"]) > 0;
  const hasResourceManagementSupport =
    countPhraseMatches(searchableEvidence, [
      "resource management",
      "manage resources",
      "managing resources",
      "allocate resources",
      "manage supplies",
      "economy management",
      "production chain",
      "production chains",
    ]) > 0;

  return filteredTags
    .filter((tag) => {
      switch (tag) {
        case "Funny":
          return !tagSet.has("Comedy") && !tagSet.has("Dark Comedy") && !tagSet.has("Satire");
        case "Comedy":
          return !tagSet.has("Dark Comedy");
        case "Psychological":
          return !tagSet.has("Psychological Horror");
        case "Horror":
          return !tagSet.has("Psychological Horror") && !tagSet.has("Survival Horror");
        case "Simulation":
          return !tagSet.has("Life Sim") && !tagSet.has("Farming Sim");
        case "Drama":
          return hasDramaSupport && !tagSet.has("Story Rich") && !tagSet.has("Mystery") && !tagSet.has("Investigation");
        case "Resource Management":
          return (
            hasResourceManagementSupport ||
            (!tagSet.has("Farming Sim") &&
              !tagSet.has("Life Sim") &&
              !tagSet.has("Crafting") &&
              !tagSet.has("Base Building") &&
              !tagSet.has("Survival"))
          );
        default:
          return true;
      }
    })
    .slice(0, MAX_SUGGESTED_TAGS);
}

const INCOMPLETE_STEAM_PAGE_RESULT_MESSAGE =
  "Steam page analysis completed, but the final result was incomplete. Please try again.";
const STEAM_PAGE_TITLE_PLACEHOLDER = "Game Title Placeholder";
const STEAM_PAGE_SHORT_DESCRIPTION_PLACEHOLDER =
  "This card will show the detected Steam page title, capsule image, and short description.";
const STEAM_PAGE_RECOMMENDATION_PLACEHOLDER =
  "The recommendation tab will summarize the strongest genre, mechanic, and setting signals, and call out any extra details worth confirming once a result is generated.";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isNonPlaceholderText(value: string, disallowedValues: string[] = []): boolean {
  const normalizedValue = normalizeText(value).toLowerCase();

  return Boolean(normalizedValue) && !disallowedValues.some((entry) => normalizedValue === normalizeText(entry).toLowerCase());
}

function isHttpUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function decodeSteamText(value: string): string {
  const $ = cheerio.load(`<div>${value}</div>`);
  return normalizeText($.text());
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

function cleanSteamHtmlToText(value: string): string {
  const $ = cheerio.load(`<div>${value}</div>`);

  $("br").replaceWith("\n");
  $("li").each((_, element) => {
    $(element).prepend("- ");
  });

  return normalizeText($.text().replace(/About This Game/gi, " "));
}

async function fetchSteamStoreData(rawUrl: string): Promise<SteamStoreData> {
  const parsedSteamUrl = parseSteamUrl(rawUrl);

  if (!parsedSteamUrl) {
    throw new Error("Invalid Steam URL.");
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
    fetch(`https://store.steampowered.com/api/appdetails?appids=${parsedSteamUrl.appId}&l=english`, {
      cache: "no-store",
      headers: {
        "User-Agent": STEAM_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
    }),
  ]);

  const $ = cheerio.load(pageResponse.data);
  const detailsPayload = (await detailsResponse.json()) as Record<string, { data?: Record<string, unknown> }>;
  const details = detailsPayload?.[parsedSteamUrl.appId]?.data ?? {};

  const title =
    normalizeText($(".apphub_AppName").first().text()) ||
    (typeof details.name === "string" ? normalizeText(details.name) : "");
  const shortDescription =
    (typeof details.short_description === "string" ? decodeSteamText(details.short_description) : "") ||
    normalizeText($(".game_description_snippet").first().text());
  const aboutFromPage = normalizeText($("#game_area_description").first().text().replace(/About This Game/i, " "));
  const aboutFromApi =
    typeof details.about_the_game === "string"
      ? cleanSteamHtmlToText(details.about_the_game)
      : typeof details.detailed_description === "string"
        ? cleanSteamHtmlToText(details.detailed_description)
        : "";
  const aboutThisGame = aboutFromApi || aboutFromPage || shortDescription;
  const currentTags = extractCurrentTags($);
  const capsuleUrl =
    (typeof details.header_image === "string" && details.header_image.trim()) ||
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${parsedSteamUrl.appId}/header.jpg`;
  const genres = Array.isArray(details.genres)
    ? details.genres
        .map((entry) => (entry && typeof entry === "object" && typeof (entry as { description?: unknown }).description === "string"
          ? normalizeText((entry as { description: string }).description)
          : ""))
        .filter(Boolean)
    : [];
  const categories = Array.isArray(details.categories)
    ? details.categories
        .map((entry) => (entry && typeof entry === "object" && typeof (entry as { description?: unknown }).description === "string"
          ? normalizeText((entry as { description: string }).description)
          : ""))
        .filter(Boolean)
    : [];

  if (!title) {
    throw new Error("Steam page loaded, but the game title could not be extracted.");
  }

  return {
    appId: parsedSteamUrl.appId,
    title,
    capsuleUrl,
    shortDescription,
    aboutThisGame,
    currentTags,
    genres,
    categories,
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

function normalizeStringArray(values: string[]): string[] {
  return uniqueStrings(values.map((value) => value.trim()).filter(Boolean));
}

function formatHumanList(values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildFallbackRecommendation(title: string, evaluation: Omit<SteamPageTagEvaluation, "recommendation">): string {
  const sentences: string[] = [];

  if (evaluation.goodTags.length > 0) {
    sentences.push(`Green tags like ${formatHumanList(evaluation.goodTags.slice(0, 4))} fit ${title}'s core store-page evidence well.`);
  }

  if (evaluation.suggestedTags.length > 0) {
    sentences.push(`Blue suggestions such as ${formatHumanList(evaluation.suggestedTags.slice(0, 4))} could improve discoverability by surfacing missing mechanics or themes.`);
  } else {
    sentences.push("There are no obvious blue additions beyond the current Steam tag set.");
  }

  if (evaluation.weakTags.length > 0) {
    sentences.push(`Red tags such as ${formatHumanList(evaluation.weakTags.slice(0, 3))} look weak or overly broad and are candidates for removal.`);
  } else {
    sentences.push("There are no obvious red tags that need removal right now.");
  }

  if (evaluation.reviewTags.length > 0) {
    sentences.push(`Yellow tags like ${formatHumanList(evaluation.reviewTags.slice(0, 3))} deserve manual review because they may fit but feel broad or secondary.`);
  }

  return sentences.join(" ").slice(0, 520);
}

async function requestSteamPageTagEvaluation(storeData: SteamStoreData): Promise<SteamPageTagEvaluation> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          `You are a Steam tagging expert evaluating an existing Steam store page. Use only the supplied store evidence and current Steam tags. Categorize every current Steam tag into exactly one of goodTags, weakTags, or reviewTags. goodTags means clearly strong and central. weakTags means misleading, unsupported, or too weak relative to the evidence. reviewTags means plausible but broad, secondary, or uncertain and worth manual review. Return suggestedTags for clearly supported missing Steam canonical tags not already present on the page. Suggested tags must come only from this allowed canonical Steam tag whitelist: ${STEAM_TAGS.join(", ")}. Do not suggest tags already present in the current Steam tag list. Use reviewTags only for genuinely uncertain current tags. Do not let uncertainty about missing tags suppress clear suggestedTags. If the page strongly supports 1 to 3 missing discoverability tags, recommend them directly as suggestedTags rather than leaving blue empty. Prefer sharper, more discoverability-useful canonical tags over generic stand-ins when both fit. Do not default strong discoverability tags like Atmospheric, Horror, Mystery, Story Rich, Choices Matter, Multiple Endings, Investigation, Psychological Horror, Walking Simulator, Life Sim, Farming Sim, Relaxing, or Singleplayer to zero suggestions when the page clearly supports them and the current tags do not already cover that angle. Zero suggestedTags is appropriate only when the current Steam tags already cover the major missing discoverability angles. For vague evidence, you may infer a few broad, high-probability tags from genre, perspective, mechanics, setting, and player-mode cues, but do not invent narrow unsupported tags. Keep suggestedTags to at most ${MAX_SUGGESTED_TAGS}. Return a short recommendation paragraph that explicitly addresses why green tags fit, why blue tags could help, why red tags look weak, and why yellow tags need review. Return valid JSON in exactly this shape: {"goodTags":["tag1"],"suggestedTags":["tag2"],"weakTags":["tag3"],"reviewTags":["tag4"],"recommendation":"text"}.`,
      },
      {
        role: "user",
        content: [
          `Game title: ${storeData.title}`,
          `Current Steam tags: ${storeData.currentTags.join(", ") || "None extracted"}`,
          `Genres: ${storeData.genres.join(", ") || "None extracted"}`,
          `Categories: ${storeData.categories.join(", ") || "None extracted"}`,
          `Short description: ${storeData.shortDescription || "None extracted"}`,
          `About This Game: ${storeData.aboutThisGame || "None extracted"}`,
        ].join("\n\n"),
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content?.trim();

  if (!rawContent) {
    throw new Error("Steam tag evaluation returned no content.");
  }

  let parsed: SteamPageTagEvaluationPayload;

  try {
    parsed = JSON.parse(rawContent) as SteamPageTagEvaluationPayload;
  } catch {
    throw new Error("Steam tag evaluation returned invalid JSON.");
  }

  const currentTagSet = new Set(storeData.currentTags);
  const goodTags = uniqueStrings(
    Array.isArray(parsed.goodTags) ? parsed.goodTags.filter((tag): tag is string => typeof tag === "string" && currentTagSet.has(tag)) : []
  );
  const reviewTagsFromModel = uniqueStrings(
    Array.isArray(parsed.reviewTags) ? parsed.reviewTags.filter((tag): tag is string => typeof tag === "string" && currentTagSet.has(tag)) : []
  ).filter((tag) => !goodTags.includes(tag));
  const weakTags = uniqueStrings(
    Array.isArray(parsed.weakTags) ? parsed.weakTags.filter((tag): tag is string => typeof tag === "string" && currentTagSet.has(tag)) : []
  ).filter((tag) => !goodTags.includes(tag) && !reviewTagsFromModel.includes(tag));
  const classifiedTagSet = new Set([...goodTags, ...reviewTagsFromModel, ...weakTags]);
  const reviewTags = [...reviewTagsFromModel, ...storeData.currentTags.filter((tag) => !classifiedTagSet.has(tag))];
  const modelSuggestedTags = filterCanonicalSteamTags(parsed.suggestedTags)
    .filter((tag) => !currentTagSet.has(tag))
    .slice(0, MAX_SUGGESTED_TAGS);
  const inferredSuggestedTags = inferEvidenceSupportedSuggestedTags(storeData, storeData.currentTags, modelSuggestedTags);
  const suggestedTags = cleanupSuggestedTags(
    storeData,
    filterCanonicalSteamTags([...modelSuggestedTags, ...inferredSuggestedTags]).slice(0, MAX_SUGGESTED_TAGS)
  );
  const finalGoodTags = storeData.currentTags.filter((tag) => goodTags.includes(tag));
  const finalWeakTags = storeData.currentTags.filter((tag) => weakTags.includes(tag));
  const finalReviewTags = storeData.currentTags.filter(
    (tag) => reviewTags.includes(tag) && !goodTags.includes(tag) && !weakTags.includes(tag)
  );
  const fallbackRecommendation = buildFallbackRecommendation(storeData.title, {
    goodTags: finalGoodTags,
    suggestedTags,
    weakTags: finalWeakTags,
    reviewTags: finalReviewTags,
  });

  return {
    goodTags: finalGoodTags,
    suggestedTags,
    weakTags: finalWeakTags,
    reviewTags: finalReviewTags,
    recommendation: fallbackRecommendation,
  };
}

function buildSteamPageModeSuccessPayload(
  storeData: SteamStoreData,
  evaluation: SteamPageTagEvaluation
): SteamPageModeSuccessPayload {
  return {
    appId: storeData.appId.trim(),
    title: storeData.title.trim(),
    capsuleUrl: storeData.capsuleUrl.trim(),
    shortDescription: storeData.shortDescription.trim(),
    aboutThisGame: storeData.aboutThisGame.trim(),
    currentTags: normalizeStringArray(storeData.currentTags),
    goodTags: normalizeStringArray(evaluation.goodTags),
    suggestedTags: normalizeStringArray(evaluation.suggestedTags),
    weakTags: normalizeStringArray(evaluation.weakTags),
    reviewTags: normalizeStringArray(evaluation.reviewTags),
    recommendation: evaluation.recommendation.trim(),
  };
}

function hasCompleteSteamPageModeSuccessPayload(payload: SteamPageModeSuccessPayload): boolean {
  const classifiedCurrentTagCount = payload.goodTags.length + payload.weakTags.length + payload.reviewTags.length;
  const hasCompleteTagBuckets = payload.currentTags.length > 0 && classifiedCurrentTagCount === payload.currentTags.length;

  return (
    Boolean(payload.appId) &&
    isNonPlaceholderText(payload.title, [STEAM_PAGE_TITLE_PLACEHOLDER]) &&
    isHttpUrl(payload.capsuleUrl) &&
    isNonPlaceholderText(payload.shortDescription, [STEAM_PAGE_SHORT_DESCRIPTION_PLACEHOLDER]) &&
    hasCompleteTagBuckets &&
    isNonPlaceholderText(payload.recommendation, [STEAM_PAGE_RECOMMENDATION_PLACEHOLDER])
  );
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonError("Server is missing OPENAI_API_KEY.", 500);
  }

  const accessToken = getSupabaseAccessTokenFromAuthorizationHeader(request.headers.get("authorization"));

  let body: SteamPageModeRequest;

  try {
    body = (await request.json()) as SteamPageModeRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const steamUrl = typeof body.url === "string" ? body.url.trim() : "";

  if (!steamUrl) {
    return jsonError("A Steam URL is required.", 400);
  }

  const creditsGate = await requireSteamTagToolCredits({
    source: "steam-tag-tool/steam-page",
    accessToken,
  });

  if (!creditsGate.ok) {
    return jsonError(creditsGate.error, creditsGate.status);
  }

  try {
    const storeData = await fetchSteamStoreData(steamUrl);
    const evaluation = await requestSteamPageTagEvaluation(storeData);
    const successPayload = buildSteamPageModeSuccessPayload(storeData, evaluation);

    if (!hasCompleteSteamPageModeSuccessPayload(successPayload)) {
      return jsonError(INCOMPLETE_STEAM_PAGE_RESULT_MESSAGE, 500);
    }

    const deductionResult = await deductSteamTagToolCredit(creditsGate.userId, creditsGate.balance, {
      source: "steam-tag-tool/steam-page",
      accessToken,
    });

    if (!deductionResult.ok) {
      return jsonError(deductionResult.error, deductionResult.status);
    }

    return NextResponse.json({
      ...successPayload,
      remainingCredits: deductionResult.remainingBalance,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
      return jsonError("Failed to load the Steam page.", 500);
    }

    if (error instanceof Error && error.message.trim()) {
      const status = error.message === "Invalid Steam URL." ? 400 : 500;
      return jsonError(error.message, status);
    }

    return jsonError("Failed to load the Steam page.", 500);
  }
}