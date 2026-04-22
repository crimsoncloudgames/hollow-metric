import { getOpenAIClient } from "@/lib/openai";

const MODEL_NAME = "gpt-4o-mini";
const STEAM_APP_ID_PATTERN = /\/app\/(\d+)/i;
const STEAM_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
const MIN_CANDIDATE_TITLES = 8;
const MAX_CANDIDATE_TITLES = 12;
const MAX_RESOLVED_COMPETITORS = 10;
const MIN_VALID_COMPETITORS = 3;
const MIN_PRICING_COMPETITORS = 2;
const MIN_TITLE_MATCH_SCORE = 55;
const PRICE_LADDER = [
  4.99, 7.99, 9.99, 12.99, 14.99, 16.99, 19.99, 24.99, 29.99, 34.99, 39.99, 44.99, 49.99,
  59.99, 69.99,
];

export const DISCLAIMER =
  "Suggested comparable games are provided as pricing context only and may not be perfect matches.";

export type FitLabel = "Strong" | "Medium" | "Weak";

export type FoundCompetitor = {
  appId: string;
  title: string;
  currentPrice: string;
  originalListPrice: string;
  shortDescription: string;
  genres: string[];
  categories: string[];
  fitLabel: FitLabel;
  fitScore: number;
  reason: string;
  selected: boolean;
};

export type FindCompetitorsResult = {
  sourceGameTitle: string;
  sourceAppId: string;
  competitors: FoundCompetitor[];
  selectedCompetitorAppIds: string[];
  selectedComparables: FoundCompetitor[];
  enoughComparables: boolean;
  insufficientDataReason: string | null;
  disclaimer: string;
  _debugRejectedCandidates?: Array<{
    candidateTitle: string;
    resolvedTitle: string;
    appId: string;
    rejectionReason: string;
  }>;
};

export type PricedComparable = {
  appId: string;
  title: string;
  currentPrice: string;
  originalListPrice: string;
  reason: string;
};

export type PricingSummary = {
  minimum_price: string;
  maximum_price: string;
  suggested_price_range_min: string;
  suggested_price_range_max: string;
  recommended_price: string;
  pricing_rationale: string;
  lowConfidence: boolean;
};

export type PriceCompetitorsResult = {
  sourceGameTitle: string;
  comparables: PricedComparable[];
  pricing: PricingSummary;
  disclaimer: string;
  lowConfidence: boolean;
};

type SteamStoreSnapshot = {
  appId: string;
  title: string;
  shortDescription: string;
  aboutThisGame: string;
  genres: string[];
  categories: string[];
};

type SteamSearchCandidate = {
  appId: string;
  title: string;
};

type SteamPriceSnapshot = {
  currentStorePrice: string;
  originalListPrice: string;
};

type ResolvedCompetitorSnapshot = {
  appId: string;
  title: string;
  shortDescription: string;
  aboutThisGame: string;
  genres: string[];
  categories: string[];
  currentPrice: string;
  originalListPrice: string;
};

type RerankSelection = {
  appId: string;
  fitLabel: FitLabel;
  fitScore: number;
  reason: string;
  selected: boolean;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeComparisonKey(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function splitComparisonWords(value: string): string[] {
  return normalizeComparisonKey(value)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length > 1);
}

function splitMeaningfulWords(value: string): string[] {
  return splitComparisonWords(value).filter((word) => word.length > 2);
}

function textOverlapRatio(leftText: string, rightText: string): number {
  const leftWords = new Set(splitMeaningfulWords(leftText));
  const rightWords = new Set(splitMeaningfulWords(rightText));

  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const word of leftWords) {
    if (rightWords.has(word)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftWords.size, rightWords.size);
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

function formatPriceFromCents(amountInCents: number, currency = "USD"): string {
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
): string {
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

function readPriceSnapshot(details: Record<string, unknown>): SteamPriceSnapshot {
  if (details.is_free === true) {
    return {
      currentStorePrice: "Free",
      originalListPrice: "Free",
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
    };
  }

  const currency =
    typeof priceOverview.currency === "string" && priceOverview.currency.trim().length > 0
      ? priceOverview.currency.trim().toUpperCase()
      : "USD";

  const currentStorePrice =
    readFormattedPriceValue(priceOverview, "final", currency) ||
    readFormattedPriceValue(priceOverview, "initial", currency) ||
    "Price unavailable";

  // Always prefer initial list price to avoid discount bias.
  const originalListPrice =
    readFormattedPriceValue(priceOverview, "initial", currency) || currentStorePrice;

  return {
    currentStorePrice,
    originalListPrice,
  };
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

function formatUsdPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function pickPriceFromLadder(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return PRICE_LADDER[0];
  }

  return PRICE_LADDER.reduce((closestPrice, candidatePrice) => {
    const candidateDistance = Math.abs(candidatePrice - value);
    const closestDistance = Math.abs(closestPrice - value);
    return candidateDistance < closestDistance ? candidatePrice : closestPrice;
  });
}

function buildTitleMatchScore(candidateTitle: string, requestedTitle: string): number {
  const normalizedCandidate = normalizeComparisonKey(candidateTitle);
  const normalizedRequested = normalizeComparisonKey(requestedTitle);

  if (!normalizedCandidate || !normalizedRequested) {
    return 0;
  }

  if (normalizedCandidate === normalizedRequested) {
    return 100;
  }

  if (
    normalizedCandidate.startsWith(normalizedRequested) ||
    normalizedRequested.startsWith(normalizedCandidate)
  ) {
    return 88;
  }

  if (
    normalizedCandidate.includes(normalizedRequested) ||
    normalizedRequested.includes(normalizedCandidate)
  ) {
    return 78;
  }

  const candidateWords = new Set(splitComparisonWords(normalizedCandidate));
  const requestedWords = splitComparisonWords(normalizedRequested);

  if (candidateWords.size === 0 || requestedWords.length === 0) {
    return 0;
  }

  const sharedWords = requestedWords.filter((word) => candidateWords.has(word));
  const overlapRatio = sharedWords.length / Math.max(requestedWords.length, candidateWords.size);

  if (sharedWords.length >= 2 && overlapRatio >= 0.5) {
    return 68;
  }

  if (sharedWords.length >= 2 && overlapRatio >= 0.34) {
    return 58;
  }

  if (sharedWords.length === 1) {
    // Intentionally weak: one-word overlap should not pass.
    return 20;
  }

  return 0;
}

function passesTitleAcceptance(candidateTitle: string, requestedTitle: string): boolean {
  return buildTitleMatchScore(candidateTitle, requestedTitle) >= MIN_TITLE_MATCH_SCORE;
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

async function fetchSteamAppDetails(appId: string): Promise<Record<string, unknown> | null> {
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
  return payload?.[appId]?.data ?? null;
}

function hasBlockedTitleToken(title: string): boolean {
  return /\b(demo|soundtrack|ost|dlc|bundle|pack|season pass|art ?book|wallpaper|dedicated server|server|expansion)\b/i.test(
    title
  );
}

function hasBlockedCategoryToken(categories: string[]): boolean {
  const merged = categories.join(" ");

  return /\b(dlc|soundtrack|demo|bundle|server|tool|video|episode)\b/i.test(merged);
}

function isNonBaseGameStoreItem(
  details: Record<string, unknown>,
  snapshot: ResolvedCompetitorSnapshot
): boolean {
  const type = typeof details.type === "string" ? details.type.trim().toLowerCase() : "";

  if (!type || !["game", "dlc", "demo", "mod", "music"].includes(type)) {
    return true;
  }

  if (type !== "game") {
    return true;
  }

  if (details.is_demo_of_game === true) {
    return true;
  }

  if (hasBlockedTitleToken(snapshot.title) || hasBlockedCategoryToken(snapshot.categories)) {
    return true;
  }

  return false;
}

function readSteamSnapshotFromDetails(
  appId: string,
  details: Record<string, unknown>
): ResolvedCompetitorSnapshot | null {
  const title = typeof details.name === "string" ? normalizeText(details.name) : "";

  if (!title) {
    return null;
  }

  const shortDescription =
    typeof details.short_description === "string" ? normalizeText(details.short_description) : "";
  const aboutThisGame =
    typeof details.about_the_game === "string"
      ? normalizeText(details.about_the_game.replace(/<[^>]*>/g, " "))
      : typeof details.detailed_description === "string"
        ? normalizeText(details.detailed_description.replace(/<[^>]*>/g, " "))
        : shortDescription;

  const priceSnapshot = readPriceSnapshot(details);

  return {
    appId,
    title,
    shortDescription,
    aboutThisGame,
    genres: getTextDescriptionArray(details.genres, "description"),
    categories: getTextDescriptionArray(details.categories, "description"),
    currentPrice: priceSnapshot.currentStorePrice,
    originalListPrice: priceSnapshot.originalListPrice,
  };
}

async function fetchSourceSteamStoreSnapshot(rawUrl: string): Promise<SteamStoreSnapshot> {
  const parsedSteamUrl = parseSteamUrl(rawUrl);

  if (!parsedSteamUrl) {
    throw new Error("Enter a valid Steam store URL.");
  }

  const details = await fetchSteamAppDetails(parsedSteamUrl.appId);

  if (!details) {
    throw new Error("We couldn't read that Steam page right now.");
  }

  const snapshot = readSteamSnapshotFromDetails(parsedSteamUrl.appId, details);

  if (!snapshot) {
    throw new Error("We couldn't read that Steam page right now.");
  }

  return {
    appId: snapshot.appId,
    title: snapshot.title,
    shortDescription: snapshot.shortDescription,
    aboutThisGame: snapshot.aboutThisGame,
    genres: snapshot.genres,
    categories: snapshot.categories,
  };
}

async function requestCandidateTitles(source: SteamStoreSnapshot): Promise<string[]> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You find genuinely comparable Steam games for pricing research. Return strict JSON only: {"candidates":["Game Title"]}. Return between ${MIN_CANDIDATE_TITLES} and ${MAX_CANDIDATE_TITLES} candidate titles. A comparable game must share: (1) the core player activity — what the player spends most of their time doing (managing, exploring, surviving, solving, building, fighting, serving, making narrative choices, etc.); (2) the structural gameplay category (narrative-driven, roguelite run-based, management sim, sandbox, puzzle platformer, action-adventure, deckbuilder, survival, extraction shooter, co-op, etc.); (3) a plausible cross-shopping buying position on Steam. Do NOT suggest games that match only on setting or world theme (pirate, office, horror, sci-fi, and similar surface labels), visual style, art direction, or broad genre labels when the underlying player activity differs. A pirate-themed game is not a comparable for another pirate-themed game if one is naval action combat and the other is a narrative adventure — what the player actually does must be similar.`,
      },
      {
        role: "user",
        content: [
          `Source title: ${source.title}`,
          `Short description: ${source.shortDescription || "Unknown"}`,
          `About summary: ${source.aboutThisGame.slice(0, 1200) || "Unknown"}`,
          `Genres: ${source.genres.join(", ") || "Unknown"}`,
          `Categories: ${source.categories.join(", ") || "Unknown"}`,
        ].join("\n"),
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content?.trim();

  if (!rawContent) {
    throw new Error("We couldn't generate comparable games right now.");
  }

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(rawContent) as Record<string, unknown>;
  } catch {
    throw new Error("We couldn't generate comparable games right now.");
  }

  const candidateTitles = Array.isArray(parsed.candidates)
    ? uniqueStrings(
        parsed.candidates.flatMap((entry) => {
          if (typeof entry === "string") {
            const title = normalizeText(entry);
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

  const ranked = extractSteamSearchCandidates(payload)
    .filter((candidate) => candidate.appId !== excludedAppId)
    .slice(0, 8)
    .map((candidate, index) => ({
      candidate,
      score: buildTitleMatchScore(candidate.title, title) - index,
    }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];

  if (!best) {
    return null;
  }

  if (!passesTitleAcceptance(best.candidate.title, title)) {
    return null;
  }

  return best.candidate;
}

function passesResolvedCandidateAcceptance(
  candidateTitle: string,
  candidate: ResolvedCompetitorSnapshot
): string | null {
  // Only verify the Steam search returned approximately the right app for the
  // requested title. Genre/category/text overlap is evaluated by the model.
  if (buildTitleMatchScore(candidate.title, candidateTitle) < MIN_TITLE_MATCH_SCORE) {
    return "requested_title_too_weak";
  }

  return null;
}

async function resolveCandidateSnapshots(
  source: SteamStoreSnapshot,
  candidateTitles: string[],
  excludedAppId: string
): Promise<{
  snapshots: ResolvedCompetitorSnapshot[];
  debugRejected: Array<{ candidateTitle: string; resolvedTitle: string; appId: string; rejectionReason: string }>;
}> {
  const debugRejected: Array<{ candidateTitle: string; resolvedTitle: string; appId: string; rejectionReason: string }> = [];

  const resolved = await Promise.all(
    candidateTitles.map(async (candidateTitle, index) => {
      try {
        const match = await searchSteamComparableGame(candidateTitle, excludedAppId);

        if (!match) {
          return null;
        }

        const details = await fetchSteamAppDetails(match.appId);

        if (!details) {
          return null;
        }

        const snapshot = readSteamSnapshotFromDetails(match.appId, details);

        if (!snapshot) {
          return null;
        }

        if (isNonBaseGameStoreItem(details, snapshot)) {
          debugRejected.push({
            candidateTitle,
            resolvedTitle: snapshot.title,
            appId: snapshot.appId,
            rejectionReason: "non_base_game",
          });
          return null;
        }

        const rejectionReason = passesResolvedCandidateAcceptance(candidateTitle, snapshot);

        if (rejectionReason !== null) {
          debugRejected.push({
            candidateTitle,
            resolvedTitle: snapshot.title,
            appId: snapshot.appId,
            rejectionReason,
          });
          return null;
        }

        return {
          index,
          snapshot,
        };
      } catch {
        return null;
      }
    })
  );

  const seen = new Set<string>();

  const snapshots = resolved
    .filter(
      (entry): entry is { index: number; snapshot: ResolvedCompetitorSnapshot } => Boolean(entry)
    )
    .sort((left, right) => left.index - right.index)
    .filter((entry) => {
      if (seen.has(entry.snapshot.appId)) {
        return false;
      }

      seen.add(entry.snapshot.appId);
      return true;
    })
    .slice(0, MAX_RESOLVED_COMPETITORS)
    .map((entry) => entry.snapshot);

  return { snapshots, debugRejected };
}

function overlapRatio(source: string[], candidate: string[]): number {
  const sourceSet = new Set(source.map((entry) => normalizeComparisonKey(entry)).filter(Boolean));
  const candidateSet = new Set(
    candidate.map((entry) => normalizeComparisonKey(entry)).filter(Boolean)
  );

  if (sourceSet.size === 0 || candidateSet.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const value of sourceSet) {
    if (candidateSet.has(value)) {
      shared += 1;
    }
  }

  return shared / Math.max(sourceSet.size, candidateSet.size);
}

// Debug-only heuristic scorer. Never selects competitors for pricing.
function fallbackRerankSelection(
  source: SteamStoreSnapshot,
  candidates: ResolvedCompetitorSnapshot[]
): RerankSelection[] {
  return candidates
    .map((candidate) => {
      const genreRatio = overlapRatio(source.genres, candidate.genres);
      const categoryRatio = overlapRatio(source.categories, candidate.categories);
      const textRatio = textOverlapRatio(
        `${source.shortDescription} ${source.aboutThisGame}`,
        `${candidate.shortDescription} ${candidate.aboutThisGame}`
      );
      const fitScore = Math.round(
        Math.min(100, genreRatio * 100 * 0.55 + categoryRatio * 100 * 0.25 + textRatio * 100 * 0.20)
      );
      const fitLabel: FitLabel = fitScore >= 78 ? "Strong" : fitScore >= 64 ? "Medium" : "Weak";

      return {
        appId: candidate.appId,
        fitLabel,
        fitScore,
        reason: "Heuristic score (debug only — not used for selection).",
        selected: false, // Never selects; display/debug context only.
      };
    })
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, MAX_RESOLVED_COMPETITORS);
}

async function rerankValidatedCompetitors(
  source: SteamStoreSnapshot,
  candidates: ResolvedCompetitorSnapshot[]
): Promise<RerankSelection[]> {
  if (candidates.length === 0) {
    return [];
  }

  const openai = getOpenAIClient();
  const candidateByAppId = new Map(candidates.map((c) => [c.appId, c]));

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are selecting the most comparable Steam games to a source game for pricing research. Return strict JSON only: {"selected":[{"appId":"string","fitLabel":"Strong|Medium","reason":"string"}]}. Use only the provided appIds. Do not invent games. Select up to 3. Return fewer if fewer are genuinely comparable — do not pad with thematic or loosely adjacent matches.\n\nA good comparable shares: (1) what the player spends most of their time doing (core gameplay loop); (2) structural gameplay category (narrative-driven, roguelite run-based, management sim, sandbox, puzzle progression, action-platformer, deckbuilder, survival, extraction shooter, co-op, or equivalent); (3) similar player fantasy or emotional experience; (4) plausible customer cross-shopping position on Steam.\n\n"Strong": clearly comparable on most dimensions above. "Medium": comparable on core loop and structure but differs in scope, pacing, or depth. Do NOT include a game whose primary connection to the source is shared setting, world theme, aesthetic, or art style — if the core player activity differs fundamentally, exclude it entirely. Prefer 2 Strong results over 3 that include a theme-only filler. Your reason must describe the gameplay and structural match, not the thematic or visual similarity.',
        },
        {
          role: "user",
          content: JSON.stringify({
            source: {
              appId: source.appId,
              title: source.title,
              shortDescription: source.shortDescription,
              aboutSummary: source.aboutThisGame.slice(0, 1200),
              genres: source.genres,
              categories: source.categories,
            },
            candidates: candidates.map((candidate) => ({
              appId: candidate.appId,
              title: candidate.title,
              shortDescription: candidate.shortDescription,
              aboutSummary: candidate.aboutThisGame.slice(0, 900),
              genres: candidate.genres,
              categories: candidate.categories,
              originalListPrice: candidate.originalListPrice,
            })),
          }),
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content?.trim();

    if (!rawContent) {
      // Model call returned no content: fail closed, no pricing.
      return fallbackRerankSelection(source, candidates);
    }

    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    const rawSelected = Array.isArray(parsed.selected) ? parsed.selected : [];
    const allowedIds = new Set(candidates.map((candidate) => candidate.appId));

    // Model-selected entries: the model is the authority for which are comparable.
    const modelSelected = rawSelected
      .flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }

        const record = entry as Record<string, unknown>;
        const appId = typeof record.appId === "string" ? record.appId.trim() : "";

        if (!appId || !allowedIds.has(appId)) {
          return [];
        }

        const rawLabel = record.fitLabel;
        const fitLabel: FitLabel =
          rawLabel === "Strong" || rawLabel === "Medium" ? rawLabel : "Weak";
        const reason =
          typeof record.reason === "string" && record.reason.trim().length > 0
            ? normalizeText(record.reason)
            : "Selected as a close gameplay and customer-intent competitor.";

        const candidate = candidateByAppId.get(appId);
        const hasParsablePrice =
          candidate !== undefined &&
          parseComparablePrice(candidate.originalListPrice) !== null;

        // Selected = model said Strong or Medium AND has a usable list price.
        const isSelected = fitLabel !== "Weak" && hasParsablePrice;

        return [
          {
            appId,
            fitLabel: (isSelected ? fitLabel : "Weak") as FitLabel,
            fitScore: fitLabel === "Strong" ? 90 : fitLabel === "Medium" ? 70 : 0,
            reason,
            selected: isSelected,
          },
        ];
      })
      .slice(0, 3); // Model already ranks them; honour that order.

    // Append remaining candidates with heuristic scores for display, never selected.
    const selectedAppIds = new Set(modelSelected.map((s) => s.appId));
    const displayOnly = fallbackRerankSelection(source, candidates)
      .filter((entry) => !selectedAppIds.has(entry.appId))
      .map((entry) => ({ ...entry, selected: false as const }));

    return [...modelSelected, ...displayOnly];
  } catch {
    // On any failure, return all candidates as display-only (fail closed).
    return fallbackRerankSelection(source, candidates);
  }
}

function mapValidatedCompetitors(
  candidates: ResolvedCompetitorSnapshot[],
  reranked: RerankSelection[]
): FoundCompetitor[] {
  const selectionById = new Map<string, RerankSelection>();

  for (const selection of reranked) {
    if (!selectionById.has(selection.appId)) {
      selectionById.set(selection.appId, selection);
    }
  }

  return candidates
    .map((candidate) => {
      const selectedEntry = selectionById.get(candidate.appId);

      return {
        appId: candidate.appId,
        title: candidate.title,
        currentPrice: candidate.currentPrice,
        originalListPrice: candidate.originalListPrice,
        shortDescription: candidate.shortDescription,
        genres: candidate.genres,
        categories: candidate.categories,
        fitLabel: selectedEntry?.fitLabel ?? "Weak",
        fitScore: selectedEntry?.fitScore ?? 0,
        reason:
          selectedEntry?.reason ??
          "Not selected as a direct gameplay competitor after validation against the source title.",
        selected: Boolean(selectedEntry?.selected && selectedEntry.fitLabel !== "Weak"),
      };
    })
    .sort((left, right) => {
      if (left.selected !== right.selected) {
        return left.selected ? -1 : 1;
      }

      return right.fitScore - left.fitScore;
    });
}

function buildSimplePricing(comparables: PricedComparable[]): PricingSummary {
  const numericPrices = comparables
    .map((entry) => ({
      title: entry.title,
      numericPrice: parseComparablePrice(entry.originalListPrice),
    }))
    .filter((entry): entry is { title: string; numericPrice: number } => entry.numericPrice !== null)
    .sort((left, right) => left.numericPrice - right.numericPrice);

  if (numericPrices.length < MIN_PRICING_COMPETITORS) {
    throw new Error("Insufficient priced competitors to build a recommendation.");
  }

  const lowConfidence = numericPrices.length < MIN_VALID_COMPETITORS;
  const minPrice = numericPrices[0].numericPrice;
  const maxPrice = numericPrices[numericPrices.length - 1].numericPrice;
  // For 3 comparables: median index 1. For 2 comparables: average of both.
  const midpointPrice =
    numericPrices.length === 2
      ? (minPrice + maxPrice) / 2
      : numericPrices[Math.floor(numericPrices.length / 2)].numericPrice;
  const recommended = pickPriceFromLadder(midpointPrice);

  const rationale = lowConfidence
    ? `Low-confidence result based on only ${numericPrices.length} comparable game${numericPrices.length === 1 ? "" : "s"} instead of the standard 3. Recommended launch price is derived from the midpoint (${formatUsdPrice(midpointPrice)}) of the available original non-discounted list prices. Consider this a rough directional estimate only.`
    : `Recommended launch price is centered on the median original non-discounted list price (${formatUsdPrice(midpointPrice)}) across the three selected validated competitors, with min and max based on their observed original list prices.`;

  return {
    minimum_price: formatUsdPrice(minPrice),
    maximum_price: formatUsdPrice(maxPrice),
    suggested_price_range_min: formatUsdPrice(minPrice),
    suggested_price_range_max: formatUsdPrice(maxPrice),
    recommended_price: formatUsdPrice(recommended),
    pricing_rationale: rationale,
    lowConfidence,
  };
}

export async function findCompetitorsForSteamUrl(url: string): Promise<FindCompetitorsResult> {
  const source = await fetchSourceSteamStoreSnapshot(url);
  const candidateTitles = await requestCandidateTitles(source);
  const { snapshots: resolvedCandidates, debugRejected } = await resolveCandidateSnapshots(
    source,
    candidateTitles,
    source.appId
  );

  if (resolvedCandidates.length === 0) {
    return {
      sourceGameTitle: source.title,
      sourceAppId: source.appId,
      competitors: [],
      selectedCompetitorAppIds: [],
      selectedComparables: [],
      enoughComparables: false,
      insufficientDataReason:
        "No resolved Steam candidates passed strict relevance validation for this source game.",
      disclaimer: DISCLAIMER,
      _debugRejectedCandidates: debugRejected,
    };
  }

  const reranked = await rerankValidatedCompetitors(source, resolvedCandidates);
  const initialCompetitors = mapValidatedCompetitors(resolvedCandidates, reranked);

  const selectedIds = initialCompetitors
    .filter(
      (entry) =>
        entry.selected &&
        entry.fitLabel !== "Weak" &&
        parseComparablePrice(entry.originalListPrice) !== null
    )
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, MIN_VALID_COMPETITORS)
    .map((entry) => entry.appId);

  const selectedSet = new Set(selectedIds);
  const competitors = initialCompetitors.map((entry) => ({
    ...entry,
    selected: selectedSet.has(entry.appId),
  }));

  const selectedComparables = competitors.filter(
    (entry) =>
      entry.selected &&
      entry.fitLabel !== "Weak" &&
      parseComparablePrice(entry.originalListPrice) !== null
  );

  const enoughComparables = selectedComparables.length >= MIN_PRICING_COMPETITORS;

  return {
    sourceGameTitle: source.title,
    sourceAppId: source.appId,
    competitors,
    selectedCompetitorAppIds: selectedComparables.map((entry) => entry.appId),
    selectedComparables,
    enoughComparables,
    insufficientDataReason: enoughComparables
      ? null
      : "Fewer than 2 validated selected competitors had usable original non-discounted list prices.",
    disclaimer: DISCLAIMER,
    _debugRejectedCandidates: debugRejected,
  };
}

export async function buildPricingFromCompetitors(
  sourceGameTitle: string,
  sourceAppId: string,
  competitors: FoundCompetitor[],
  selectedCompetitorAppIds: string[]
): Promise<PriceCompetitorsResult> {
  const dedupedByAppId = new Map<string, FoundCompetitor>();

  for (const competitor of competitors) {
    const appId = normalizeText(competitor.appId);

    if (!appId || appId === sourceAppId) {
      continue;
    }

    const existing = dedupedByAppId.get(appId);

    if (!existing || competitor.fitScore > existing.fitScore) {
      dedupedByAppId.set(appId, {
        ...competitor,
        appId,
        title: normalizeText(competitor.title),
      });
    }
  }

  const explicitSelectedIds = uniqueStrings(
    selectedCompetitorAppIds
      .map((value) => normalizeText(value))
      .filter((value) => value && value !== sourceAppId)
  );

  if (explicitSelectedIds.length < MIN_PRICING_COMPETITORS || explicitSelectedIds.length > MIN_VALID_COMPETITORS) {
    throw new Error("Between 2 and 3 explicit selected competitors are required for pricing.");
  }

  const selectedCandidates = explicitSelectedIds
    .map((appId) => dedupedByAppId.get(appId) ?? null)
    .filter((entry): entry is FoundCompetitor => Boolean(entry));

  if (selectedCandidates.length < MIN_PRICING_COMPETITORS) {
    throw new Error("Selected competitors must be present in the validated competitors list.");
  }

  if (
    selectedCandidates.some(
      (entry) => !entry.selected || entry.fitLabel === "Weak" || parseComparablePrice(entry.originalListPrice) === null
    )
  ) {
    throw new Error("Selected competitors failed validation checks for pricing.");
  }

  const refreshedComparables = await Promise.all(
    selectedCandidates.map(async (entry) => {
      const details = await fetchSteamAppDetails(entry.appId);

      if (!details) {
        return null;
      }

      const refreshedTitle =
        typeof details.name === "string" && normalizeText(details.name)
          ? normalizeText(details.name)
          : entry.title;
      const priceSnapshot = readPriceSnapshot(details);
      const originalNumeric = parseComparablePrice(priceSnapshot.originalListPrice);

      if (originalNumeric === null) {
        return null;
      }

      return {
        appId: entry.appId,
        title: refreshedTitle,
        currentPrice: priceSnapshot.currentStorePrice,
        originalListPrice: priceSnapshot.originalListPrice,
        reason: entry.reason,
      } satisfies PricedComparable;
    })
  );

  const comparables = refreshedComparables.filter(
    (entry): entry is PricedComparable => Boolean(entry)
  );

  if (comparables.length < MIN_PRICING_COMPETITORS) {
    throw new Error("Insufficient priced competitor data to calculate a recommendation.");
  }

  const pricing = buildSimplePricing(comparables);

  return {
    sourceGameTitle,
    comparables,
    pricing,
    disclaimer: DISCLAIMER,
    lowConfidence: pricing.lowConfidence,
  };
}
