import { NextResponse } from "next/server";
import {
  deductSteamTagToolCredit,
  getSupabaseAccessTokenFromAuthorizationHeader,
  requireSteamTagToolCredits,
} from "@/lib/credits";
import { getOpenAIClient } from "@/lib/openai";
import { filterCanonicalSteamTags } from "@/lib/steam-tags";

export const runtime = "nodejs";

const MODEL_NAME = "gpt-4o-mini";
const MAX_FINAL_TAGS = 20;
const MAX_THIN_TAGS = 8;
const MAX_MEDIUM_TAGS = 14;

type ManualModeRequest = {
  gameTitle?: string;
  genre?: string;
  subgenre?: string;
  coreGameplayLoop?: string;
  whatThePlayerDoes?: string;
  mainObjectiveOrProgression?: string;
  perspectiveOrCameraStyle?: string;
  playerCountOrPlayModes?: string;
  coreMechanics?: string;
  settingOrTheme?: string;
  toneOrMood?: string;
  comparableGames?: string;
  extraNotes?: string;
};

type GeneratedRecommendationPayload = {
  summary?: unknown;
};

type EvidenceStrength = "thin" | "medium" | "strong";

type EvidenceProfile = {
  strength: EvidenceStrength;
  maxFinalTags: number;
  summary: string;
};

type TagCategory =
  | "identity"
  | "mode"
  | "mechanic"
  | "structure"
  | "tone"
  | "setting"
  | "narrative"
  | "support";

type RuleContext = {
  payload: Required<ManualModeRequest>;
  directText: string;
  comparableText: string;
  fullText: string;
  profile: EvidenceProfile;
};

type ScoredTag = {
  tag: string;
  category: TagCategory;
  score: number;
};

type TagRule = {
  tag: string;
  category: TagCategory;
  score: (ctx: RuleContext) => number;
};

const FIELD_LIMITS = {
  gameTitle: 160,
  genre: 120,
  subgenre: 120,
  coreGameplayLoop: 1600,
  whatThePlayerDoes: 1600,
  mainObjectiveOrProgression: 1600,
  perspectiveOrCameraStyle: 120,
  playerCountOrPlayModes: 160,
  coreMechanics: 1600,
  settingOrTheme: 160,
  toneOrMood: 160,
  comparableGames: 800,
  extraNotes: 1600,
} as const;

const DIRECT_FIELD_WEIGHTS: Record<Exclude<keyof ManualModeRequest, "gameTitle" | "comparableGames">, number> = {
  genre: 1.25,
  subgenre: 1.2,
  coreGameplayLoop: 1.25,
  whatThePlayerDoes: 1.15,
  mainObjectiveOrProgression: 1.0,
  perspectiveOrCameraStyle: 1.0,
  playerCountOrPlayModes: 1.1,
  coreMechanics: 1.25,
  settingOrTheme: 1.0,
  toneOrMood: 0.95,
  extraNotes: 0.9,
};

const COMPARABLE_WEIGHT = 0.2;

const TAG_CATEGORY_LIMITS: Record<TagCategory, number> = {
  identity: 4,
  mode: 3,
  mechanic: 5,
  structure: 3,
  tone: 3,
  setting: 3,
  narrative: 4,
  support: 2,
};

const S = {
  singleplayer: ["singleplayer", "single player", "solo", "solo play", "solo campaign"],
  multiplayer: ["multiplayer", "online multiplayer", "multiple players", "play with friends"],
  coop: ["co op", "coop", "cooperative", "cooperatively", "play together", "work together", "team up"],
  onlineCoop: ["online co op", "online coop", "online cooperative"],
  localCoop: ["local co op", "local coop", "couch co op", "same screen co op"],
  pvp: ["pvp", "player versus player", "competitive multiplayer", "versus", "deathmatch", "arena battles"],

  horror: ["horror", "scary", "terrifying", "terror", "dread", "nightmare", "nightmares"],
  psychological: ["psychological", "paranoia", "hallucination", "hallucinations", "psychosis", "delusion", "delusions", "sanity", "mental breakdown", "reality distortion"],
  survival: ["survival", "stay alive", "resource scarcity", "scarce resources", "limited ammo", "limited supplies", "manage supplies", "survival pressure"],

  mystery: ["mystery", "mysterious", "whodunit", "solve the mystery"],
  investigation: ["investigation", "investigate", "investigating", "detective", "clues", "suspect", "suspects", "evidence", "crime scene", "solve cases"],

  narrativeBroad: ["narrative", "story", "plot", "storytelling"],
  storyRich: ["story rich", "strong story", "story driven", "story focused", "heavy story", "heavy narrative", "narrative driven", "narrative focused", "plot driven", "story is central", "narrative is central", "strong narrative focus", "narrative focus", "character driven narrative", "dialogue driven narrative"],
  choicesMatter: ["choices matter", "meaningful choices", "choices affect outcomes", "player choices affect", "decisions affect outcomes", "decisions change outcomes", "choices have consequences", "decisions have consequences", "branching choices", "branching outcomes", "branching paths", "choice driven", "choices affect the story", "choices shape the story", "narrative choices"],
  multipleEndings: ["multiple endings", "different endings", "alternate endings", "several endings", "branching endings", "multiple possible endings", "ending depends on choices", "endings depend on choices"],
  conversation: ["dialogue", "dialogue choices", "conversation", "conversations", "conversational", "talk to npcs", "talking to npcs", "interrogation", "interrogate", "negotiation", "negotiate", "question suspects", "speak with characters"],
  narration: ["narration", "narrated", "narrator", "voice over narration", "voiceover narration"],
  dynamicNarration: ["dynamic narration", "adaptive narration", "reactive narration", "adaptive narrator", "reactive narrator"],

  comedy: ["comedy", "comedic", "humor", "humorous"],
  funny: ["funny", "hilarious", "jokes", "joke", "laugh", "laughs", "goofy", "wacky"],
  satire: ["satire", "satirical", "parody", "social commentary", "mockery", "office satire", "corporate satire", "workplace satire"],
  atmospheric: ["atmospheric", "atmosphere", "immersive", "moody", "haunting", "eerie", "brooding", "ambient", "oppressive", "unsettling"],

  exploration: ["explore", "exploration", "discover", "discovering", "travel", "traveling", "journey", "wander"],
  openWorld: ["open world", "open world exploration", "freely explore", "sandbox world"],
  walkingExplicit: ["walking simulator", "environmental storytelling", "narrative exploration"],
  walkingSupport: ["quiet exploration", "slow exploration", "no combat", "without combat", "combat free"],

  crafting: ["craft", "crafting", "craft items", "craft gear", "make equipment"],
  baseBuilding: ["base building", "build a base", "build bases", "construct outposts", "build outposts"],
  building: ["construct", "construction", "build structures", "build facilities", "place structures", "erect buildings"],
  resourceManagement: ["resource management", "manage resources", "managing resources", "allocate resources", "supply management", "production chain", "production chains", "economic management"],
  farmingSim: ["farming sim", "farm life", "farming", "farm", "grow crops", "harvest", "livestock", "farm animals", "planting", "ranch"],
  lifeSim: ["life sim", "life simulation", "slice of life", "daily life", "town life", "village life", "build relationships", "social life", "day to day life", "routine"],
  relaxing: ["cozy", "cosy", "relaxing", "wholesome", "peaceful", "gentle", "laid back", "laid-back", "calm", "chill"],

  action: ["action", "real time action", "fast paced"],
  combat: ["combat", "fight", "fighting", "battle", "battles", "enemy", "enemies", "attack", "attacks", "gunplay", "shooting", "shooter", "hack and slash", "boss fight", "boss fights"],
  pve: ["enemy", "enemies", "ai enemies", "monsters", "creatures", "aliens", "fight enemies"],
  strategy: ["strategy", "strategic", "plan carefully", "command units"],
  tactical: ["tactical", "tactics", "positioning", "squad based", "squad command", "turn based tactics"],
  rpg: ["rpg", "role playing", "roleplaying", "rpg elements", "character build"],
  actionRpg: ["action rpg"],
  tacticalRpg: ["tactical rpg"],
  partyBasedRpg: ["party based rpg"],
  jrpg: ["jrpg"],
  crpg: ["crpg"],

  simulation: ["simulation", "simulator", "sim"],
  cityBuilder: ["city builder", "build a city", "city planning", "zoning", "public services", "traffic management"],
  colonySim: ["colony sim", "manage colonists", "colonists", "settlers", "colony management"],
  management: ["management", "manage staff", "run a business", "run a company", "manage a company", "optimize production"],
  economy: ["economy", "economic", "market forces", "trade routes", "supply chain"],

  scifi: ["sci fi", "sci-fi", "science fiction", "futuristic", "cyberpunk"],
  space: ["space", "planet", "planets", "galaxy", "galactic", "cosmic", "interstellar", "starship", "starships", "spaceship", "spaceships", "orbit", "orbital"],
  customization: ["customization", "customisation", "customize", "customise", "character creator", "create your character", "build your character", "loadout", "loadouts", "personalize", "personalise"],
  drama: ["drama", "dramatic", "melodrama", "emotionally intense"],
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function normalizeEvidenceText(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function countWords(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function sanitizePayload(value: ManualModeRequest): Required<ManualModeRequest> {
  return {
    gameTitle: normalizeText(value.gameTitle, FIELD_LIMITS.gameTitle),
    genre: normalizeText(value.genre, FIELD_LIMITS.genre),
    subgenre: normalizeText(value.subgenre, FIELD_LIMITS.subgenre),
    coreGameplayLoop: normalizeText(value.coreGameplayLoop, FIELD_LIMITS.coreGameplayLoop),
    whatThePlayerDoes: normalizeText(value.whatThePlayerDoes, FIELD_LIMITS.whatThePlayerDoes),
    mainObjectiveOrProgression: normalizeText(value.mainObjectiveOrProgression, FIELD_LIMITS.mainObjectiveOrProgression),
    perspectiveOrCameraStyle: normalizeText(value.perspectiveOrCameraStyle, FIELD_LIMITS.perspectiveOrCameraStyle),
    playerCountOrPlayModes: normalizeText(value.playerCountOrPlayModes, FIELD_LIMITS.playerCountOrPlayModes),
    coreMechanics: normalizeText(value.coreMechanics, FIELD_LIMITS.coreMechanics),
    settingOrTheme: normalizeText(value.settingOrTheme, FIELD_LIMITS.settingOrTheme),
    toneOrMood: normalizeText(value.toneOrMood, FIELD_LIMITS.toneOrMood),
    comparableGames: normalizeText(value.comparableGames, FIELD_LIMITS.comparableGames),
    extraNotes: normalizeText(value.extraNotes, FIELD_LIMITS.extraNotes),
  };
}

function hasUsableDescriptiveInput(payload: Required<ManualModeRequest>): boolean {
  return [
    payload.genre,
    payload.subgenre,
    payload.coreGameplayLoop,
    payload.whatThePlayerDoes,
    payload.mainObjectiveOrProgression,
    payload.perspectiveOrCameraStyle,
    payload.playerCountOrPlayModes,
    payload.coreMechanics,
    payload.settingOrTheme,
    payload.toneOrMood,
    payload.comparableGames,
    payload.extraNotes,
  ].some((value) => value.trim().length > 0);
}

function buildEvidenceSummary(payload: Required<ManualModeRequest>): string {
  return [
    payload.gameTitle ? `Game title: ${payload.gameTitle}` : "",
    payload.genre ? `Genre: ${payload.genre}` : "",
    payload.subgenre ? `Subgenre: ${payload.subgenre}` : "",
    payload.coreGameplayLoop ? `Core gameplay loop: ${payload.coreGameplayLoop}` : "",
    payload.whatThePlayerDoes ? `What the player does: ${payload.whatThePlayerDoes}` : "",
    payload.mainObjectiveOrProgression ? `Main objective or progression: ${payload.mainObjectiveOrProgression}` : "",
    payload.perspectiveOrCameraStyle ? `Perspective or camera style: ${payload.perspectiveOrCameraStyle}` : "",
    payload.playerCountOrPlayModes ? `Player count or play modes: ${payload.playerCountOrPlayModes}` : "",
    payload.coreMechanics ? `Core mechanics: ${payload.coreMechanics}` : "",
    payload.settingOrTheme ? `Setting or theme: ${payload.settingOrTheme}` : "",
    payload.toneOrMood ? `Tone or mood: ${payload.toneOrMood}` : "",
    payload.comparableGames ? `Comparable games for directional context only: ${payload.comparableGames}` : "",
    payload.extraNotes ? `Extra notes: ${payload.extraNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildDirectEvidenceText(payload: Required<ManualModeRequest>): string {
  return normalizeEvidenceText(
    [
      payload.genre,
      payload.subgenre,
      payload.coreGameplayLoop,
      payload.whatThePlayerDoes,
      payload.mainObjectiveOrProgression,
      payload.perspectiveOrCameraStyle,
      payload.playerCountOrPlayModes,
      payload.coreMechanics,
      payload.settingOrTheme,
      payload.toneOrMood,
      payload.extraNotes,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildComparableEvidenceText(payload: Required<ManualModeRequest>): string {
  return normalizeEvidenceText(payload.comparableGames);
}

function buildFullEvidenceText(payload: Required<ManualModeRequest>): string {
  return normalizeEvidenceText(
    [
      payload.genre,
      payload.subgenre,
      payload.coreGameplayLoop,
      payload.whatThePlayerDoes,
      payload.mainObjectiveOrProgression,
      payload.perspectiveOrCameraStyle,
      payload.playerCountOrPlayModes,
      payload.coreMechanics,
      payload.settingOrTheme,
      payload.toneOrMood,
      payload.comparableGames,
      payload.extraNotes,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildEvidenceProfile(payload: Required<ManualModeRequest>): EvidenceProfile {
  const primaryFields = [
    payload.genre,
    payload.subgenre,
    payload.coreGameplayLoop,
    payload.whatThePlayerDoes,
    payload.mainObjectiveOrProgression,
    payload.perspectiveOrCameraStyle,
    payload.playerCountOrPlayModes,
    payload.coreMechanics,
    payload.settingOrTheme,
    payload.toneOrMood,
    payload.extraNotes,
  ];

  const totalWords = primaryFields.reduce((sum, field) => sum + countWords(field), 0);
  const descriptiveFieldCount = primaryFields.filter((field) => countWords(field) >= 4).length;
  const detailedFieldCount = [
    payload.coreGameplayLoop,
    payload.whatThePlayerDoes,
    payload.mainObjectiveOrProgression,
    payload.coreMechanics,
    payload.extraNotes,
  ].filter((field) => countWords(field) >= 10).length;

  if (totalWords < 45 || descriptiveFieldCount < 5 || detailedFieldCount === 0) {
    return {
      strength: "thin",
      maxFinalTags: MAX_THIN_TAGS,
      summary: "Evidence strength is thin. Stay broad, conservative, and centered on obvious identity tags.",
    };
  }

  if (totalWords < 110 || detailedFieldCount < 3) {
    return {
      strength: "medium",
      maxFinalTags: MAX_MEDIUM_TAGS,
      summary: "Evidence strength is medium. Return core identity plus clearly supported mechanics, structure, tone, and setting tags.",
    };
  }

  return {
    strength: "strong",
    maxFinalTags: MAX_FINAL_TAGS,
    summary: "Evidence strength is strong. Return the fullest strong set justified by the description.",
  };
}

function includesPhrase(text: string, phrase: string): boolean {
  return text.includes(normalizeEvidenceText(phrase));
}

function countPhraseHits(text: string, phrases: readonly string[]): number {
  let hits = 0;

  for (const phrase of phrases) {
    if (includesPhrase(text, phrase)) {
      hits += 1;
    }
  }

  return hits;
}

function weightedPhraseScore(
  payload: Required<ManualModeRequest>,
  phrases: readonly string[],
  options?: { includeComparable?: boolean }
): number {
  const includeComparable = options?.includeComparable ?? false;

  const directFields: Array<[Exclude<keyof ManualModeRequest, "gameTitle" | "comparableGames">, string]> = [
    ["genre", payload.genre],
    ["subgenre", payload.subgenre],
    ["coreGameplayLoop", payload.coreGameplayLoop],
    ["whatThePlayerDoes", payload.whatThePlayerDoes],
    ["mainObjectiveOrProgression", payload.mainObjectiveOrProgression],
    ["perspectiveOrCameraStyle", payload.perspectiveOrCameraStyle],
    ["playerCountOrPlayModes", payload.playerCountOrPlayModes],
    ["coreMechanics", payload.coreMechanics],
    ["settingOrTheme", payload.settingOrTheme],
    ["toneOrMood", payload.toneOrMood],
    ["extraNotes", payload.extraNotes],
  ];

  let score = 0;

  for (const [fieldName, value] of directFields) {
    const hits = countPhraseHits(normalizeEvidenceText(value), phrases);
    if (hits > 0) {
      score += hits * DIRECT_FIELD_WEIGHTS[fieldName];
    }
  }

  if (includeComparable && payload.comparableGames.trim()) {
    const comparableHits = countPhraseHits(normalizeEvidenceText(payload.comparableGames), phrases);
    if (comparableHits > 0) {
      score += comparableHits * COMPARABLE_WEIGHT;
    }
  }

  return score;
}

function directPhraseScore(payload: Required<ManualModeRequest>, phrases: readonly string[]): number {
  return weightedPhraseScore(payload, phrases, { includeComparable: false });
}

function canonicalTag(tag: string): string | null {
  return filterCanonicalSteamTags([tag])[0] ?? null;
}

function createRuleContext(payload: Required<ManualModeRequest>): RuleContext {
  return {
    payload,
    directText: buildDirectEvidenceText(payload),
    comparableText: buildComparableEvidenceText(payload),
    fullText: buildFullEvidenceText(payload),
    profile: buildEvidenceProfile(payload),
  };
}

function hasAnyDirect(payload: Required<ManualModeRequest>, phrases: readonly string[]): boolean {
  return directPhraseScore(payload, phrases) > 0;
}

function scoreSimpleRule(
  payload: Required<ManualModeRequest>,
  phrases: readonly string[],
  options?: {
    includeComparable?: boolean;
    minTotal?: number;
    minDirect?: number;
    bonus?: number;
  }
): number {
  const total = weightedPhraseScore(payload, phrases, { includeComparable: options?.includeComparable });
  const direct = directPhraseScore(payload, phrases);

  if (options?.minTotal !== undefined && total < options.minTotal) {
    return 0;
  }

  if (options?.minDirect !== undefined && direct < options.minDirect) {
    return 0;
  }

  return total > 0 ? total + (options?.bonus ?? 0) : 0;
}

function buildRules(): TagRule[] {
  return [
    {
      tag: "Singleplayer",
      category: "mode",
      score: ({ payload }) => scoreSimpleRule(payload, S.singleplayer, { minDirect: 0.9 }),
    },
    {
      tag: "Multiplayer",
      category: "mode",
      score: ({ payload }) => scoreSimpleRule(payload, S.multiplayer, { minDirect: 0.9 }),
    },
    {
      tag: "Co-op",
      category: "mode",
      score: ({ payload }) => scoreSimpleRule(payload, S.coop, { minDirect: 0.9 }),
    },
    {
      tag: "Online Co-op",
      category: "mode",
      score: ({ payload }) => scoreSimpleRule(payload, S.onlineCoop, { minDirect: 0.9, bonus: 0.4 }),
    },
    {
      tag: "Local Co-Op",
      category: "mode",
      score: ({ payload }) => scoreSimpleRule(payload, S.localCoop, { minDirect: 0.9, bonus: 0.4 }),
    },
    {
      tag: "PvP",
      category: "mode",
      score: ({ payload }) => scoreSimpleRule(payload, S.pvp, { minDirect: 0.9 }),
    },

    {
      tag: "Horror",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.horror, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Psychological",
      category: "support",
      score: ({ payload }) => scoreSimpleRule(payload, S.psychological, { minDirect: 1.0 }),
    },
    {
      tag: "Psychological Horror",
      category: "identity",
      score: ({ payload }) => {
        const psychDirect = directPhraseScore(payload, S.psychological);
        const horrorDirect = directPhraseScore(payload, S.horror);
        const total = psychDirect + horrorDirect;

        if (psychDirect < 0.9 || horrorDirect < 0.9) {
          return 0;
        }

        return total + 1.5;
      },
    },
    {
      tag: "Survival",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.survival, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Survival Horror",
      category: "identity",
      score: ({ payload }) => {
        const survivalDirect = directPhraseScore(payload, S.survival);
        const horrorDirect = directPhraseScore(payload, S.horror);
        const total = survivalDirect + horrorDirect;

        if (survivalDirect < 0.9 || horrorDirect < 0.9) {
          return 0;
        }

        return total + 1.5;
      },
    },

    {
      tag: "Mystery",
      category: "narrative",
      score: ({ payload }) => scoreSimpleRule(payload, S.mystery, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Investigation",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.investigation, { minDirect: 0.9, includeComparable: true, bonus: 0.4 }),
    },

    {
      tag: "Story Rich",
      category: "narrative",
      score: ({ payload }) => scoreSimpleRule(payload, S.storyRich, { minDirect: 1.0, includeComparable: true, bonus: 0.7 }),
    },
    {
      tag: "Choices Matter",
      category: "narrative",
      score: ({ payload }) => scoreSimpleRule(payload, S.choicesMatter, { minDirect: 1.0, bonus: 0.8 }),
    },
    {
      tag: "Multiple Endings",
      category: "structure",
      score: ({ payload }) => scoreSimpleRule(payload, S.multipleEndings, { minDirect: 1.0, bonus: 0.8 }),
    },
    {
      tag: "Conversation",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.conversation, { minDirect: 1.0, bonus: 0.3 }),
    },
    {
      tag: "Narration",
      category: "narrative",
      score: ({ payload }) => scoreSimpleRule(payload, S.narration, { minDirect: 1.0, bonus: 0.3 }),
    },
    {
      tag: "Dynamic Narration",
      category: "narrative",
      score: ({ payload }) => scoreSimpleRule(payload, S.dynamicNarration, { minDirect: 1.0, bonus: 0.6 }),
    },

    {
      tag: "Comedy",
      category: "tone",
      score: ({ payload }) => {
        const comedy = weightedPhraseScore(payload, S.comedy, { includeComparable: true });
        const funny = weightedPhraseScore(payload, S.funny, { includeComparable: true });
        const satire = weightedPhraseScore(payload, S.satire, { includeComparable: true });
        return comedy + satire * 0.4 + funny * 0.25;
      },
    },
    {
      tag: "Funny",
      category: "support",
      score: ({ payload }) => scoreSimpleRule(payload, S.funny, { minDirect: 1.0 }),
    },
    {
      tag: "Satire",
      category: "tone",
      score: ({ payload }) => scoreSimpleRule(payload, S.satire, { minDirect: 1.0, includeComparable: true, bonus: 0.6 }),
    },
    {
      tag: "Atmospheric",
      category: "tone",
      score: ({ payload }) => scoreSimpleRule(payload, S.atmospheric, { minDirect: 0.9, includeComparable: true }),
    },

    {
      tag: "Exploration",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.exploration, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Open World",
      category: "structure",
      score: ({ payload }) => scoreSimpleRule(payload, S.openWorld, { minDirect: 1.0, bonus: 1.0 }),
    },
    {
      tag: "Walking Simulator",
      category: "identity",
      score: ({ payload }) => {
        const explicit = directPhraseScore(payload, S.walkingExplicit);
        const support = directPhraseScore(payload, S.walkingSupport);
        const narrative = directPhraseScore(payload, S.storyRich) + directPhraseScore(payload, S.narrativeBroad);
        const mystery = directPhraseScore(payload, S.mystery) + directPhraseScore(payload, S.investigation);
        const atmospheric = directPhraseScore(payload, S.atmospheric);

        if (explicit >= 0.9) {
          return explicit + Math.max(narrative, mystery, atmospheric) + 0.8;
        }

        if (support >= 1.5 && (narrative >= 1.2 || mystery >= 1.2 || atmospheric >= 1.2)) {
          return support + Math.max(narrative, mystery, atmospheric) + 0.6;
        }

        return 0;
      },
    },

    {
      tag: "Crafting",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.crafting, { minDirect: 0.9 }),
    },
    {
      tag: "Base Building",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.baseBuilding, { minDirect: 1.0, bonus: 0.5 }),
    },
    {
      tag: "Building",
      category: "support",
      score: ({ payload }) => scoreSimpleRule(payload, S.building, { minDirect: 1.2 }),
    },
    {
      tag: "Resource Management",
      category: "support",
      score: ({ payload }) => scoreSimpleRule(payload, S.resourceManagement, { minDirect: 1.1 }),
    },
    {
      tag: "Farming Sim",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.farmingSim, { minDirect: 1.0, includeComparable: true, bonus: 1.0 }),
    },
    {
      tag: "Life Sim",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.lifeSim, { minDirect: 1.0, includeComparable: true, bonus: 0.9 }),
    },
    {
      tag: "Relaxing",
      category: "tone",
      score: ({ payload }) => {
        const relaxing = scoreSimpleRule(payload, S.relaxing, { minDirect: 0.9, includeComparable: true });
        const horror = directPhraseScore(payload, S.horror);
        return horror > 0 ? 0 : relaxing;
      },
    },

    {
      tag: "Action",
      category: "identity",
      score: ({ payload }) => {
        const action = weightedPhraseScore(payload, S.action, { includeComparable: true });
        const combat = weightedPhraseScore(payload, S.combat, { includeComparable: true });
        return action + combat * 0.75;
      },
    },
    {
      tag: "Combat",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.combat, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "PvE",
      category: "mode",
      score: ({ payload }) => {
        const pve = scoreSimpleRule(payload, S.pve, { minDirect: 0.9, includeComparable: true });
        const pvp = directPhraseScore(payload, S.pvp);
        return pvp > 0 ? 0 : pve;
      },
    },
    {
      tag: "Strategy",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.strategy, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Tactical",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.tactical, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "RPG",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.rpg, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Action RPG",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.actionRpg, { minDirect: 1.0, bonus: 1.3 }),
    },
    {
      tag: "Tactical RPG",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.tacticalRpg, { minDirect: 1.0, bonus: 1.3 }),
    },
    {
      tag: "Party-Based RPG",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.partyBasedRpg, { minDirect: 1.0, bonus: 1.1 }),
    },
    {
      tag: "JRPG",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.jrpg, { minDirect: 1.0, bonus: 1.1 }),
    },
    {
      tag: "CRPG",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.crpg, { minDirect: 1.0, bonus: 1.1 }),
    },

    {
      tag: "Simulation",
      category: "support",
      score: ({ payload }) => scoreSimpleRule(payload, S.simulation, { minDirect: 1.0, includeComparable: true }),
    },
    {
      tag: "City Builder",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.cityBuilder, { minDirect: 1.0, bonus: 1.0 }),
    },
    {
      tag: "Colony Sim",
      category: "identity",
      score: ({ payload }) => scoreSimpleRule(payload, S.colonySim, { minDirect: 1.0, bonus: 0.9 }),
    },
    {
      tag: "Management",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.management, { minDirect: 1.0, includeComparable: true }),
    },
    {
      tag: "Economy",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.economy, { minDirect: 1.0, includeComparable: true }),
    },

    {
      tag: "Sci-fi",
      category: "setting",
      score: ({ payload }) => scoreSimpleRule(payload, S.scifi, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Space",
      category: "setting",
      score: ({ payload }) => scoreSimpleRule(payload, S.space, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Character Customization",
      category: "mechanic",
      score: ({ payload }) => scoreSimpleRule(payload, S.customization, { minDirect: 0.9, includeComparable: true }),
    },
    {
      tag: "Drama",
      category: "support",
      score: ({ payload }) => scoreSimpleRule(payload, S.drama, { minDirect: 1.2 }),
    },
  ];
}

function requiredScoreFor(category: TagCategory, profile: EvidenceProfile): number {
  const matrix: Record<EvidenceStrength, Record<TagCategory, number>> = {
    thin: {
      identity: 1.55,
      mode: 0.95,
      mechanic: 1.4,
      structure: 1.55,
      tone: 1.35,
      setting: 1.25,
      narrative: 1.55,
      support: 1.7,
    },
    medium: {
      identity: 1.15,
      mode: 0.9,
      mechanic: 1.05,
      structure: 1.15,
      tone: 1.0,
      setting: 0.95,
      narrative: 1.15,
      support: 1.35,
    },
    strong: {
      identity: 0.9,
      mode: 0.85,
      mechanic: 0.9,
      structure: 0.95,
      tone: 0.9,
      setting: 0.85,
      narrative: 0.95,
      support: 1.15,
    },
  };

  return matrix[profile.strength][category];
}

function mergeBestScores(scored: ScoredTag[]): ScoredTag[] {
  const map = new Map<string, ScoredTag>();

  for (const item of scored) {
    const existing = map.get(item.tag);
    if (!existing || item.score > existing.score) {
      map.set(item.tag, item);
    }
  }

  return Array.from(map.values());
}

function scoreRules(ctx: RuleContext): ScoredTag[] {
  const raw: ScoredTag[] = [];

  for (const rule of buildRules()) {
    const canonical = canonicalTag(rule.tag);

    if (!canonical) {
      continue;
    }

    const score = rule.score(ctx);
    if (score <= 0) {
      continue;
    }

    raw.push({
      tag: canonical,
      category: rule.category,
      score,
    });
  }

  return mergeBestScores(raw).filter((item) => item.score >= requiredScoreFor(item.category, ctx.profile));
}

function applyUniversalPromotions(scored: ScoredTag[], ctx: RuleContext): ScoredTag[] {
  const map = new Map<string, ScoredTag>(scored.map((item) => [item.tag, { ...item }]));
  const has = (tag: string) => map.has(tag);
  const remove = (tag: string) => {
    map.delete(tag);
  };
  const boost = (tag: string, amount: number) => {
    const current = map.get(tag);
    if (current) {
      current.score += amount;
    }
  };

  if (has("Psychological Horror")) {
    remove("Psychological");
    remove("Horror");
  }

  if (has("Survival Horror")) {
    remove("Survival");
    remove("Horror");
  }

  if (has("Action RPG")) {
    remove("Action");
    boost("RPG", 0.45);
  }

  if (has("Tactical RPG")) {
    remove("Tactical");
    boost("RPG", 0.45);
  }

  if (has("Farming Sim")) {
    remove("Simulation");
    boost("Life Sim", 0.25);
  }

  if (has("Life Sim")) {
    remove("Simulation");
  }

  if (has("Comedy") || has("Satire")) {
    remove("Funny");
  }

  if (has("City Builder")) {
    remove("Building");
    boost("Management", 0.2);
    boost("Economy", 0.2);
  }

  if (has("Colony Sim")) {
    remove("Simulation");
    boost("Management", 0.25);
  }

  if (has("Mystery") && has("Investigation")) {
    boost("Investigation", 0.25);
  }

  if (has("Choices Matter")) {
    boost("Story Rich", 0.2);
  }

  if (has("Story Rich")) {
    boost("Conversation", 0.15);
  }

  if (has("Drama")) {
    const hasStrongerNarrativeSignal =
      has("Story Rich") ||
      has("Choices Matter") ||
      has("Multiple Endings") ||
      has("Mystery") ||
      has("Investigation") ||
      has("Narration") ||
      has("Dynamic Narration");

    if (hasStrongerNarrativeSignal) {
      remove("Drama");
    }
  }

  if (has("Resource Management")) {
    const hasStrongerLoopSignal =
      has("Farming Sim") ||
      has("Life Sim") ||
      has("Crafting") ||
      has("Base Building") ||
      has("Survival") ||
      has("City Builder") ||
      has("Colony Sim");

    if (hasStrongerLoopSignal) {
      remove("Resource Management");
    }
  }

  if (has("Walking Simulator")) {
    const directExplicit = directPhraseScore(ctx.payload, S.walkingExplicit);
    if (directExplicit <= 0 && ctx.profile.strength !== "strong") {
      remove("Walking Simulator");
    }
  }

  return Array.from(map.values());
}

function sortScored(scored: ScoredTag[]): ScoredTag[] {
  return [...scored].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.tag.localeCompare(b.tag);
  });
}

function selectFinalTags(scored: ScoredTag[], ctx: RuleContext): string[] {
  const sorted = sortScored(scored);
  const maxTags = ctx.profile.maxFinalTags;
  const result: ScoredTag[] = [];
  const seen = new Set<string>();
  const categoryCounts = new Map<TagCategory, number>();

  for (const item of sorted) {
    if (result.length >= maxTags) {
      break;
    }

    if (seen.has(item.tag)) {
      continue;
    }

    const currentCount = categoryCounts.get(item.category) ?? 0;
    if (currentCount >= TAG_CATEGORY_LIMITS[item.category]) {
      continue;
    }

    result.push(item);
    seen.add(item.tag);
    categoryCounts.set(item.category, currentCount + 1);
  }

  if (ctx.profile.strength === "strong" && result.length < Math.min(10, maxTags)) {
    for (const item of sorted) {
      if (result.length >= maxTags) {
        break;
      }

      if (seen.has(item.tag)) {
        continue;
      }

      result.push(item);
      seen.add(item.tag);
    }
  }

  return result.map((item) => item.tag);
}

function forceExplicitTags(tags: string[], ctx: RuleContext): string[] {
  const result = [...tags];

  const forced: string[] = [];
  const pushForced = (tag: string) => {
    const canonical = canonicalTag(tag);
    if (canonical && !forced.includes(canonical)) {
      forced.push(canonical);
    }
  };

  if (hasAnyDirect(ctx.payload, S.singleplayer)) pushForced("Singleplayer");
  if (hasAnyDirect(ctx.payload, S.multiplayer)) pushForced("Multiplayer");
  if (hasAnyDirect(ctx.payload, S.coop)) pushForced("Co-op");
  if (hasAnyDirect(ctx.payload, S.onlineCoop)) pushForced("Online Co-op");
  if (hasAnyDirect(ctx.payload, S.localCoop)) pushForced("Local Co-Op");
  if (hasAnyDirect(ctx.payload, S.pvp)) pushForced("PvP");

  if (hasAnyDirect(ctx.payload, S.storyRich)) pushForced("Story Rich");
  if (hasAnyDirect(ctx.payload, S.choicesMatter)) pushForced("Choices Matter");
  if (hasAnyDirect(ctx.payload, S.multipleEndings)) pushForced("Multiple Endings");
  if (hasAnyDirect(ctx.payload, S.mystery)) pushForced("Mystery");
  if (hasAnyDirect(ctx.payload, S.investigation)) pushForced("Investigation");
  if (hasAnyDirect(ctx.payload, S.comedy)) pushForced("Comedy");
  if (hasAnyDirect(ctx.payload, S.satire)) pushForced("Satire");
  if (hasAnyDirect(ctx.payload, S.atmospheric)) pushForced("Atmospheric");
  if (hasAnyDirect(ctx.payload, S.farmingSim)) pushForced("Farming Sim");
  if (hasAnyDirect(ctx.payload, S.lifeSim)) pushForced("Life Sim");
  if (hasAnyDirect(ctx.payload, S.cityBuilder)) pushForced("City Builder");
  if (hasAnyDirect(ctx.payload, S.colonySim)) pushForced("Colony Sim");
  if (hasAnyDirect(ctx.payload, S.openWorld)) pushForced("Open World");
  if (hasAnyDirect(ctx.payload, S.actionRpg)) pushForced("Action RPG");
  if (hasAnyDirect(ctx.payload, S.tacticalRpg)) pushForced("Tactical RPG");
  if (hasAnyDirect(ctx.payload, S.crpg)) pushForced("CRPG");
  if (hasAnyDirect(ctx.payload, S.jrpg)) pushForced("JRPG");

  if (directPhraseScore(ctx.payload, S.psychological) > 0 && directPhraseScore(ctx.payload, S.horror) > 0) {
    pushForced("Psychological Horror");
  }

  if (directPhraseScore(ctx.payload, S.survival) > 0 && directPhraseScore(ctx.payload, S.horror) > 0) {
    pushForced("Survival Horror");
  }

  for (const tag of forced) {
    if (result.includes(tag)) {
      continue;
    }

    if (result.length < ctx.profile.maxFinalTags) {
      result.push(tag);
    }
  }

  return result;
}

function cleanupFinalTags(tags: string[], ctx: RuleContext): string[] {
  const canonical = filterCanonicalSteamTags(tags);
  const set = new Set<string>(canonical);
  const cleaned: string[] = [];

  for (const tag of canonical) {
    if (tag === "Funny" && (set.has("Comedy") || set.has("Satire"))) {
      continue;
    }

    if (tag === "Psychological" && set.has("Psychological Horror")) {
      continue;
    }

    if (tag === "Horror" && (set.has("Psychological Horror") || set.has("Survival Horror"))) {
      continue;
    }

    if (tag === "Survival" && set.has("Survival Horror")) {
      continue;
    }

    if (tag === "Action" && set.has("Action RPG")) {
      continue;
    }

    if (tag === "Tactical" && set.has("Tactical RPG")) {
      continue;
    }

    if (tag === "Simulation" && (set.has("Farming Sim") || set.has("Life Sim") || set.has("City Builder") || set.has("Colony Sim"))) {
      continue;
    }

    if (
      tag === "Drama" &&
      (
        set.has("Story Rich") ||
        set.has("Choices Matter") ||
        set.has("Multiple Endings") ||
        set.has("Mystery") ||
        set.has("Investigation") ||
        set.has("Narration") ||
        set.has("Dynamic Narration")
      )
    ) {
      continue;
    }

    if (
      tag === "Resource Management" &&
      (
        set.has("Farming Sim") ||
        set.has("Life Sim") ||
        set.has("Crafting") ||
        set.has("Base Building") ||
        set.has("Survival") ||
        set.has("City Builder") ||
        set.has("Colony Sim")
      )
    ) {
      continue;
    }

    if (
      tag === "Building" &&
      (
        set.has("Base Building") ||
        set.has("City Builder") ||
        set.has("Farming Sim") ||
        set.has("Life Sim")
      )
    ) {
      continue;
    }

    if (
      tag === "Walking Simulator" &&
      directPhraseScore(ctx.payload, S.walkingExplicit) <= 0 &&
      ctx.profile.strength !== "strong"
    ) {
      continue;
    }

    if (!cleaned.includes(tag)) {
      cleaned.push(tag);
    }
  }

  return cleaned.slice(0, ctx.profile.maxFinalTags);
}

function buildFallbackRecommendationSummary(tags: string[], profile: EvidenceProfile): string {
  const lead = tags.slice(0, 4).join(", ");
  const support = tags.slice(4, 8).join(", ");

  const firstSentence =
    profile.strength === "thin"
      ? `This looks most like ${lead}.`
      : `This concept most strongly fits ${lead}.`;

  const secondSentence = support
    ? ` Supporting tags like ${support} are backed by the described mechanics, structure, tone, and setting.`
    : "";

  const combined = `${firstSentence}${secondSentence}`.trim();
  return combined.length <= 280 ? combined : `${combined.slice(0, 277).trimEnd()}...`;
}

function parseRecommendationSummary(rawContent: string): string {
  let parsed: GeneratedRecommendationPayload;

  try {
    parsed = JSON.parse(rawContent) as GeneratedRecommendationPayload;
  } catch {
    return "";
  }

  if (typeof parsed.summary !== "string") {
    return "";
  }

  const summary = parsed.summary.trim();
  if (!summary || summary.length > 380) {
    return "";
  }

  return summary;
}

async function requestRecommendationSummary(
  evidenceSummary: string,
  tags: string[],
  evidenceProfile: EvidenceProfile
): Promise<string> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return "";
  }

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.2,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          'You write the recommendation tab summary for a Steam tag tool. Write 1 or 2 short sentences, under 280 characters total, explaining why the final tags fit the game. Do not mention tags that were not selected. Return valid JSON in exactly this shape: {"summary":"text"}.',
      },
      {
        role: "user",
        content: [
          `Game concept evidence:\n${evidenceSummary}`,
          `Evidence profile: ${evidenceProfile.summary}`,
          `Final selected tags: ${tags.join(", ")}`,
        ].join("\n\n"),
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content?.trim();
  return rawContent ? parseRecommendationSummary(rawContent) : "";
}

export async function POST(request: Request) {
  const accessToken = getSupabaseAccessTokenFromAuthorizationHeader(request.headers.get("authorization"));

  let requestBody: ManualModeRequest;

  try {
    requestBody = (await request.json()) as ManualModeRequest;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const payload = sanitizePayload(requestBody);

  if (!hasUsableDescriptiveInput(payload)) {
    return jsonError("Add at least one descriptive field before generating tags.", 400);
  }

  const creditsGate = await requireSteamTagToolCredits({
    source: "steam-tag-tool/manual",
    accessToken,
  });

  if (!creditsGate.ok) {
    return jsonError(creditsGate.error, creditsGate.status);
  }

  try {
    const evidenceSummary = buildEvidenceSummary(payload);
    const ctx = createRuleContext(payload);

    let scored = scoreRules(ctx);
    scored = applyUniversalPromotions(scored, ctx);

    let finalTags = selectFinalTags(scored, ctx);
    finalTags = forceExplicitTags(finalTags, ctx);
    finalTags = cleanupFinalTags(finalTags, ctx);

    if (finalTags.length === 0) {
      return jsonError("We could not generate a confident Steam tag set from that input.", 422);
    }

    let recommendation = buildFallbackRecommendationSummary(finalTags, ctx.profile);

    try {
      const generatedRecommendation = await requestRecommendationSummary(
        evidenceSummary,
        finalTags,
        ctx.profile
      );

      if (generatedRecommendation) {
        recommendation = generatedRecommendation;
      }
    } catch (summaryError) {
      console.error("Steam tag recommendation summary generation failed", summaryError);
    }

    const deductionResult = await deductSteamTagToolCredit(creditsGate.userId, creditsGate.balance, {
      source: "steam-tag-tool/manual",
      accessToken,
    });

    if (!deductionResult.ok) {
      return jsonError(deductionResult.error, deductionResult.status);
    }

    return NextResponse.json({
      ...(payload.gameTitle ? { gameTitle: payload.gameTitle } : {}),
      tags: finalTags,
      recommendation,
      remainingCredits: deductionResult.remainingBalance,
    });
  } catch (error) {
    console.error("Manual Steam tag generation failed", error);
    return jsonError("We could not generate tags right now. Please try again.", 500);
  }
}
