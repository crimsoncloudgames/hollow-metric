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

type ModelRerankSelection = {
  appId: string;
  fitLabel: FitLabel;
  reason: string;
  coreLoopFit: number;
  structureFit: number;
  playerRoleFit: number;
  commercialAudienceFit: number;
  themeOnlyRisk: number;
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
          `You find genuinely comparable Steam games for pricing research. Return strict JSON only: {"candidates":["Game Title"]}. Return between ${MIN_CANDIDATE_TITLES} and ${MAX_CANDIDATE_TITLES} candidate titles.

A comparable game must match the source game's commercial shape, not just its theme.

Prioritize in this order:
1. Core player activity: what the player repeatedly does moment-to-moment.
2. Gameplay structure: management sim, service sim, narrative choice game, puzzle adventure, roguelite, survival, etc.
3. Player role: who the player is and what responsibility they have.
4. Commercial audience: whether the same Steam buyer would reasonably cross-shop both games.

For service, request-handling, workplace, customer, employee, choice-driven, or light-management games, prioritize games where the player actively serves, manages, responds, handles requests, makes tradeoffs, or deals with consequences.

Reject games that only match:
- setting
- theme
- humor
- coffee
- office
- visual style
- broad tags like Casual, Funny, Simulation, or Adventure

Do not suggest puzzle/adventure games as comparables for service/management games unless the player activity and structure are also strongly similar.

A game sharing an office theme is not enough.
A game sharing coffee is not enough.
A game sharing comedy is not enough.

The player must be doing similar things for similar commercial reasons.`,
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

// Scope-aware fallback selection that evaluates production scope, session structure, and complexity fit
function fallbackRerankSelection(
  source: SteamStoreSnapshot,
  candidates: ResolvedCompetitorSnapshot[]
): RerankSelection[] {
  // Analyze source game scope characteristics
  const sourceText = `${source.shortDescription} ${source.aboutThisGame}`.toLowerCase();
  const sourceGenres = source.genres.map(g => g.toLowerCase());
  const sourceCategories = source.categories.map(c => c.toLowerCase());

  // Determine source game scope indicators
  const isLargeScope = /\b(tycoon|empire|civilization|city|world|kingdom|colony|civilization|management|business|economy|industry|corporate|studio|publisher|AAA|blockbuster)\b/i.test(sourceText) ||
                      sourceGenres.some(g => /\b(strategy|simulation|management|tycoon|empire)\b/i.test(g));
  const isSmallScope = /\b(indie|small|cozy|short|prototype|experimental|narrative|story|adventure|puzzle|casual|arcade)\b/i.test(sourceText) ||
                      sourceCategories.some(c => /\bsingle-player|short\b/i.test(c));
  const isServiceSim = /\b(service|sim|simulation|management|restaurant|shop|store|hotel|hospital|airport|farm|cafe|bar|pub|bakery|coffee|office|work|job|employee|staff|customer|client|visitor|guest)\b/i.test(sourceText);
  const isNarrative = /\b(story|narrative|choice|dialogue|character|plot|adventure|RPG|role-playing|visual novel|interactive fiction)\b/i.test(sourceText);
  const isSystemic = /\b(system|economy|resource|production|supply|chain|building|construction|expansion|growth|progression|upgrade|research|technology)\b/i.test(sourceText);
  const isCasual = /\b(casual|quick|short|simple|easy|relaxed|chill|fun|arcade|puzzle|match|platform|runner)\b/i.test(sourceText);

  return candidates
    .map((candidate) => {
      const candidateText = `${candidate.shortDescription} ${candidate.aboutThisGame}`.toLowerCase();
      const candidateGenres = candidate.genres.map(g => g.toLowerCase());
      const candidateCategories = candidate.categories.map(c => c.toLowerCase());

      // Analyze candidate scope characteristics
      const candidateIsLargeScope = /\b(tycoon|empire|civilization|city|world|kingdom|colony|civilization|management|business|economy|industry|corporate|studio|publisher|AAA|blockbuster)\b/i.test(candidateText) ||
                                   candidateGenres.some(g => /\b(strategy|simulation|management|tycoon|empire)\b/i.test(g));
      const candidateIsSmallScope = /\b(indie|small|cozy|short|prototype|experimental|narrative|story|adventure|puzzle|casual|arcade)\b/i.test(candidateText) ||
                                   candidateCategories.some(c => /\bsingle-player|short\b/i.test(c));
      const candidateIsServiceSim = /\b(service|sim|simulation|management|restaurant|shop|store|hotel|hospital|airport|farm|cafe|bar|pub|bakery|coffee|office|work|job|employee|staff|customer|client|visitor|guest)\b/i.test(candidateText);
      const candidateIsNarrative = /\b(story|narrative|choice|dialogue|character|plot|adventure|RPG|role-playing|visual novel|interactive fiction)\b/i.test(candidateText);
      const candidateIsSystemic = /\b(system|economy|resource|production|supply|chain|building|construction|expansion|growth|progression|upgrade|research|technology)\b/i.test(candidateText);
      const candidateIsCasual = /\b(casual|quick|short|simple|easy|relaxed|chill|fun|arcade|puzzle|match|platform|runner)\b/i.test(candidateText);

      // Calculate scope fit scores (0-10 scale)
      let productionScopeFit = 5; // Start neutral
      let sessionStructureFit = 5;
      let complexityFit = 5;

      // Production scope fit - penalize large scope games for small scope sources and vice versa
      if (isLargeScope && candidateIsSmallScope) {
        productionScopeFit = 2; // Large scope source with small scope candidate = poor fit
      } else if (isSmallScope && candidateIsLargeScope) {
        productionScopeFit = 2; // Small scope source with large scope candidate = poor fit
      } else if (isLargeScope && candidateIsLargeScope) {
        productionScopeFit = 8; // Both large scope = good fit
      } else if (isSmallScope && candidateIsSmallScope) {
        productionScopeFit = 8; // Both small scope = good fit
      }

      // Session structure fit - penalize mismatched game types
      if (isServiceSim && candidateIsNarrative) {
        sessionStructureFit = 3; // Service sim vs narrative = poor fit
      } else if (isNarrative && candidateIsServiceSim) {
        sessionStructureFit = 3; // Narrative vs service sim = poor fit
      } else if (isServiceSim && candidateIsServiceSim) {
        sessionStructureFit = 9; // Both service sim = excellent fit
      } else if (isNarrative && candidateIsNarrative) {
        sessionStructureFit = 9; // Both narrative = excellent fit
      } else if (isSystemic && candidateIsSystemic) {
        sessionStructureFit = 8; // Both systemic = good fit
      } else if (isCasual && candidateIsCasual) {
        sessionStructureFit = 8; // Both casual = good fit
      }

      // Complexity fit - consider scope and systemic nature
      if (isLargeScope && isSystemic && candidateIsLargeScope && candidateIsSystemic) {
        complexityFit = 9; // Complex large systemic games match well
      } else if (isSmallScope && isCasual && candidateIsSmallScope && candidateIsCasual) {
        complexityFit = 9; // Simple small casual games match well
      } else if (isLargeScope && candidateIsSmallScope) {
        complexityFit = 2; // Large scope source with small scope candidate = complexity mismatch
      } else if (isSmallScope && candidateIsLargeScope) {
        complexityFit = 2; // Small scope source with large scope candidate = complexity mismatch
      }

      // Calculate overall fit score with scope weighting
      const scopeFitScore = (productionScopeFit * 4 + sessionStructureFit * 4 + complexityFit * 2) / 10; // 0-10 scale

      // Traditional heuristic scores for baseline
      const genreRatio = overlapRatio(source.genres, candidate.genres);
      const categoryRatio = overlapRatio(source.categories, candidate.categories);
      const textRatio = textOverlapRatio(sourceText, candidateText);
      const heuristicScore = Math.round(
        Math.min(100, genreRatio * 100 * 0.55 + categoryRatio * 100 * 0.25 + textRatio * 100 * 0.20)
      );

      // Combined score: 70% scope fit, 30% traditional heuristic
      const combinedScore = Math.round(scopeFitScore * 7 + heuristicScore * 0.3);

      // Determine fit label based on combined score and scope fit requirements
      let fitLabel: FitLabel = "Weak";
      let selected = false;
      let reason = "Fallback selection with scope analysis.";

      // Only select if scope fit is adequate and combined score meets threshold
      if (productionScopeFit >= 3 && sessionStructureFit >= 3 && complexityFit >= 3) {
        if (combinedScore >= 75) {
          fitLabel = "Strong";
          selected = true;
          reason = `Strong scope fit (${productionScopeFit}/10 production, ${sessionStructureFit}/10 structure, ${complexityFit}/10 complexity) with good overall similarity.`;
        } else if (combinedScore >= 60) {
          fitLabel = "Medium";
          selected = true;
          reason = `Medium scope fit (${productionScopeFit}/10 production, ${sessionStructureFit}/10 structure, ${complexityFit}/10 complexity) with reasonable overall similarity.`;
        } else {
          reason = `Weak overall fit despite adequate scope compatibility (${productionScopeFit}/10 production, ${sessionStructureFit}/10 structure, ${complexityFit}/10 complexity).`;
        }
      } else {
        reason = `Insufficient scope compatibility (${productionScopeFit}/10 production, ${sessionStructureFit}/10 structure, ${complexityFit}/10 complexity) for fallback pricing context.`;
      }

      return {
        appId: candidate.appId,
        fitLabel,
        fitScore: combinedScore,
        reason,
        selected,
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

  const clampScore = (value: number): number => {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
  };

  const readScore = (record: Record<string, unknown>, key: string): number => {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.min(10, value));
    }

    return 0;
  };

  const passesStrictThresholds = (entry: ModelRerankSelection): boolean => {
    return (
      entry.coreLoopFit >= 7 &&
      entry.structureFit >= 6 &&
      entry.playerRoleFit >= 6 &&
      entry.commercialAudienceFit >= 6 &&
      entry.themeOnlyRisk <= 4
    );
  };

  const calculateFitScore = (entry: ModelRerankSelection): number => {
    return clampScore(
      entry.coreLoopFit * 3 +
      entry.structureFit * 2 +
      entry.playerRoleFit * 2 +
      entry.commercialAudienceFit * 2 -
      entry.themeOnlyRisk * 2
    );
  };

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are selecting the most comparable Steam games to a source game for pricing research. Return strict JSON only: {"selected":[{"appId":"string","fitLabel":"Strong|Medium|Weak","coreLoopFit":0,"structureFit":0,"playerRoleFit":0,"commercialAudienceFit":0,"themeOnlyRisk":0,"reason":"string"}]}.\n\nUse only the provided appIds. Do not invent games. Score every selected candidate honestly.\n\nScore definitions:\n- coreLoopFit: 0-10. Does the player repeatedly do similar actions?\n- structureFit: 0-10. Is the game structure similar, such as service sim, management sim, narrative choice, puzzle adventure, etc.?\n- playerRoleFit: 0-10. Is the player responsibility/role similar?\n- commercialAudienceFit: 0-10. Would the same Steam buyer realistically cross-shop both games?\n- themeOnlyRisk: 0-10. Higher means the match is mainly based on theme, setting, humor, coffee, office, tags, or aesthetic instead of gameplay.\n\nStrict selection rules:\n- Select up to 3.\n- Return fewer than 3 if only fewer are genuinely comparable.\n- Do not pad with weak or thematic matches.\n- A candidate should only be Strong or Medium if coreLoopFit >= 7, structureFit >= 6, playerRoleFit >= 6, commercialAudienceFit >= 6, and themeOnlyRisk <= 4.\n- Strong should usually have coreLoopFit >= 8 and structureFit >= 7.\n- If a game mainly matches setting, humor, office, coffee, art style, or broad tags, mark it Weak or omit it.\n- Puzzle/adventure games should not be selected for service/management/request-handling games unless the core player activity is also similar.\n\nThe reason must explain what the player actually does in both games and why buyers would cross-shop them.',
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
      return fallbackRerankSelection(source, candidates);
    }

    const parsed = JSON.parse(rawContent) as Record<string, unknown>;
    const rawSelected = Array.isArray(parsed.selected) ? parsed.selected : [];
    const allowedIds = new Set(candidates.map((candidate) => candidate.appId));

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

        const candidate = candidateByAppId.get(appId);
        const hasParsablePrice =
          candidate !== undefined && parseComparablePrice(candidate.originalListPrice) !== null;

        const rawLabel = record.fitLabel;
        const modelLabel: FitLabel =
          rawLabel === "Strong" || rawLabel === "Medium" || rawLabel === "Weak"
            ? rawLabel
            : "Weak";

        const scoredEntry: ModelRerankSelection = {
          appId,
          fitLabel: modelLabel,
          reason:
            typeof record.reason === "string" && record.reason.trim().length > 0
              ? normalizeText(record.reason)
              : "Scored as a possible comparable, but no detailed reason was provided.",
          coreLoopFit: readScore(record, "coreLoopFit"),
          structureFit: readScore(record, "structureFit"),
          playerRoleFit: readScore(record, "playerRoleFit"),
          commercialAudienceFit: readScore(record, "commercialAudienceFit"),
          themeOnlyRisk: readScore(record, "themeOnlyRisk"),
        };

        const fitScore = calculateFitScore(scoredEntry);
        const passesThresholds = passesStrictThresholds(scoredEntry);

        let fitLabel: FitLabel = "Weak";

        if (passesThresholds && fitScore >= 75 && scoredEntry.coreLoopFit >= 8 && scoredEntry.structureFit >= 7) {
          fitLabel = "Strong";
        } else if (passesThresholds && fitScore >= 60) {
          fitLabel = "Medium";
        }

        const selected = fitLabel !== "Weak" && hasParsablePrice;

        return [
          {
            appId,
            fitLabel,
            fitScore,
            reason: scoredEntry.reason,
            selected,
          },
        ];
      })
      .filter((entry) => entry.selected)
      .sort((left, right) => right.fitScore - left.fitScore)
      .slice(0, 3);

    const selectedAppIds = new Set(modelSelected.map((s) => s.appId));
    const displayOnly = fallbackRerankSelection(source, candidates)
      .filter((entry) => !selectedAppIds.has(entry.appId))
      .map((entry) => ({ ...entry, selected: false as const }));

    return [...modelSelected, ...displayOnly];
  } catch {
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

function buildSimplePricing(
  comparables: PricedComparable[],
  forceDirectionalLowConfidence = false
): PricingSummary {
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

  const lowConfidence = forceDirectionalLowConfidence || numericPrices.length < MIN_VALID_COMPETITORS;
  const minPrice = numericPrices[0].numericPrice;
  const maxPrice = numericPrices[numericPrices.length - 1].numericPrice;
  const midpointPrice =
    numericPrices.length === 2
      ? (minPrice + maxPrice) / 2
      : numericPrices[Math.floor(numericPrices.length / 2)].numericPrice;
  const recommended = pickPriceFromLadder(midpointPrice);

  const rationale = forceDirectionalLowConfidence
    ? `Directional, low-confidence pricing context based on limited strict comparable confidence. The estimate uses ${numericPrices.length} priced comparable game${numericPrices.length === 1 ? "" : "s"} and the midpoint (${formatUsdPrice(midpointPrice)}) of their original non-discounted list prices. Treat this as a directional guide rather than a precise recommendation.`
    : lowConfidence
      ? `Low-confidence result based on only ${numericPrices.length} comparable game${numericPrices.length === 1 ? "" : "s"} instead of the standard 3. Recommended launch price is derived from the midpoint (${formatUsdPrice(midpointPrice)}) of the available original non-discounted list prices. Consider this a rough directional estimate only.`
      : `Recommended launch price is centered on the median original non-discounted list price (${formatUsdPrice(midpointPrice)}) across the selected validated competitors, with min and max based on their observed original list prices.`;

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

  const strictSelectedComparables = initialCompetitors
    .filter(
      (entry) =>
        entry.selected &&
        entry.fitLabel !== "Weak" &&
        parseComparablePrice(entry.originalListPrice) !== null
    )
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, MIN_VALID_COMPETITORS);

  const pricedCandidates = initialCompetitors
    .filter((entry) => parseComparablePrice(entry.originalListPrice) !== null)
    .sort((left, right) => right.fitScore - left.fitScore);

  let finalSelectedComparables = strictSelectedComparables.slice();
  const finalSelectedIds = new Set(finalSelectedComparables.map((entry) => entry.appId));
  let fallbackUsed = false;

  if (finalSelectedComparables.length < MIN_PRICING_COMPETITORS) {
    fallbackUsed = true;

    // Only use fallback candidates that meet minimum scope similarity requirements
    const viableFallbackCandidates = pricedCandidates.filter((candidate) => {
      // Must have at least Medium fit or Strong fit with adequate scope compatibility
      if (candidate.fitLabel === "Strong") {
        return true;
      }
      if (candidate.fitLabel === "Medium") {
        // For Medium fit, check if the reason indicates adequate scope compatibility
        const reason = candidate.reason.toLowerCase();
        return reason.includes("production") && reason.includes("structure") && reason.includes("complexity") &&
               !reason.includes("insufficient scope compatibility");
      }
      return false;
    });

    // If we have viable fallback candidates, use them
    if (viableFallbackCandidates.length > 0) {
      for (const candidate of viableFallbackCandidates) {
        if (finalSelectedIds.has(candidate.appId)) {
          continue;
        }

        finalSelectedComparables.push({
          ...candidate,
          selected: true,
          reason:
            candidate.reason && candidate.reason.trim().length > 0
              ? `${candidate.reason} Included as low-confidence pricing context because strict comparable confidence was limited.`
              : "Included as low-confidence pricing context because strict comparable confidence was limited.",
        });
        finalSelectedIds.add(candidate.appId);

        if (finalSelectedComparables.length >= MIN_VALID_COMPETITORS) {
          break;
        }
      }
    }
    // If no viable fallback candidates, we'll handle this below
  }

  const selectedSet = new Set(finalSelectedComparables.map((entry) => entry.appId));
  const competitors = initialCompetitors.map((entry) => {
    if (!selectedSet.has(entry.appId)) {
      return entry;
    }

    const selectedCandidate = finalSelectedComparables.find((candidate) => candidate.appId === entry.appId);

    return {
      ...entry,
      selected: true,
      reason:
        selectedCandidate?.reason && selectedCandidate.reason.trim().length > 0
          ? selectedCandidate.reason
          : entry.reason,
    };
  });

  const selectedComparables = finalSelectedComparables.map((entry) => ({
    ...entry,
    selected: true,
  }));

  const enoughComparables = selectedComparables.length >= MIN_PRICING_COMPETITORS;

  let insufficientDataReason: string | null = null;
  if (!enoughComparables) {
    if (fallbackUsed && finalSelectedComparables.length === 0) {
      insufficientDataReason = "No competitors met minimum scope and gameplay similarity requirements for pricing context. Consider broadening your game's core mechanics or target audience for better comparable discovery.";
    } else {
      insufficientDataReason = "Fewer than 2 resolved competitors had usable original non-discounted list prices.";
    }
  }

  return {
    sourceGameTitle: source.title,
    sourceAppId: source.appId,
    competitors,
    selectedCompetitorAppIds: selectedComparables.map((entry) => entry.appId),
    selectedComparables,
    enoughComparables,
    insufficientDataReason,
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

  const pricedCandidates = Array.from(dedupedByAppId.values()).filter(
    (entry) => parseComparablePrice(entry.originalListPrice) !== null
  );

  if (pricedCandidates.length < MIN_PRICING_COMPETITORS) {
    throw new Error("Insufficient priced competitor data to calculate a recommendation.");
  }

  const strictSelectedCandidates = selectedCandidates.filter(
    (entry) =>
      entry.selected === true &&
      entry.fitLabel !== "Weak" &&
      parseComparablePrice(entry.originalListPrice) !== null
  );

  const pricedCandidatesByScore = pricedCandidates
    .slice()
    .sort((left, right) => right.fitScore - left.fitScore);

  let finalSelectedCandidates = strictSelectedCandidates.slice();
  let lowConfidenceFallback = false;

  // Check if any selected candidates were included via fallback (indicated by "low-confidence pricing context" in reason)
  const hasFallbackCandidates = selectedCandidates.some(candidate =>
    candidate.reason && candidate.reason.includes("low-confidence pricing context")
  );

  if (hasFallbackCandidates) {
    lowConfidenceFallback = true;
  }

  if (finalSelectedCandidates.length < MIN_PRICING_COMPETITORS) {
    lowConfidenceFallback = true;

    for (const candidate of pricedCandidatesByScore) {
      if (finalSelectedCandidates.some((entry) => entry.appId === candidate.appId)) {
        continue;
      }

      const fallbackReason = candidate.reason
        ? `${candidate.reason} This competitor is included as low-confidence pricing context because strict comparable confidence was limited.`
        : "Included as low-confidence pricing context because strict comparable confidence was limited.";

      finalSelectedCandidates.push({
        ...candidate,
        selected: true,
        reason: fallbackReason,
      });

      if (finalSelectedCandidates.length >= MIN_PRICING_COMPETITORS) {
        break;
      }
    }
  }

  if (finalSelectedCandidates.length < MIN_PRICING_COMPETITORS) {
    throw new Error("Insufficient priced competitor data to calculate a recommendation.");
  }

  const refreshedComparables = await Promise.all(
    finalSelectedCandidates.map(async (entry) => {
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

  const pricing = buildSimplePricing(comparables, lowConfidenceFallback);

  return {
    sourceGameTitle,
    comparables,
    pricing,
    disclaimer: DISCLAIMER,
    lowConfidence: pricing.lowConfidence,
  };
}
