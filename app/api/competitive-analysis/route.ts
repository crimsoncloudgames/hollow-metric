import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  deductCompetitiveAnalysisCredit,
  getSupabaseAccessTokenFromAuthorizationHeader,
  requireCompetitiveAnalysisCredits,
} from "@/lib/credits";
import { getOpenAIClient } from "@/lib/openai";
import { requireVerifiedUser } from "@/lib/verified-user";
import {
  createClient as createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/utils/supabase/server";

export const runtime = "nodejs";

const MODEL_NAME = "gpt-4o";

function logTiming(stage: string, startedAt: number, details?: Record<string, unknown>) {
  console.info("Competitive analysis timing", {
    stage,
    durationMs: Math.round(performance.now() - startedAt),
    ...(details ?? {}),
  });
}

const SYSTEM_PROMPT = `You are an expert game designer and market analyst performing a deep competitive analysis for an indie game developer.

Your task is to analyze the provided game description and produce a structured competitive intelligence report.

You MUST follow these rules without exception:
- Do NOT rely on broad tags like Indie, Action, Adventure, RPG, Casual, Horror, Atmosphere, Story Rich, or Strategy as primary evidence for similarity.
- Do NOT force popular games into the result because they are famous.
- Do NOT confuse influences with real competitors.
- Do NOT use price as a primary reason for similarity.
- Reject weak matches clearly instead of padding the list.
- All scores must be integers from 0 to 5.

The seven scoring dimensions are:
1. gameplayLoopFit — How closely does the core gameplay loop match?
2. playerFantasyFit — How closely does the player fantasy / role match?
3. structureProgressionFit — How closely does the progression and structure match?
4. presentationFit — How closely does the visual and audio presentation style match?
5. toneFit — How closely does the emotional tone match?
6. settingFit — How closely does the setting or world match?
7. commercialLaneFit — How closely does the commercial positioning and audience match?

You must return strict JSON only in exactly this shape:

{
  "coreDNA": {
    "coreMechanics": "string — describe the core gameplay loop in 1–2 sentences",
    "playerFantasy": "string — describe what role and fantasy the player inhabits",
    "narrativeTheme": "string — describe the narrative or thematic hook",
    "aestheticStyle": "string — describe visual and audio presentation",
    "pressureModel": "string — describe the emotional pressure (cozy, oppressive, high-speed, etc.)"
  },
  "directCompetitors": [
    {
      "title": "string",
      "category": "Direct Competitor",
      "scores": {
        "gameplayLoopFit": 0,
        "playerFantasyFit": 0,
        "structureProgressionFit": 0,
        "presentationFit": 0,
        "toneFit": 0,
        "settingFit": 0,
        "commercialLaneFit": 0
      },
      "explanation": "string — 2–3 sentences explaining why this belongs here"
    }
  ],
  "adjacentCompetitors": [
    {
      "title": "string",
      "category": "Adjacent Competitor",
      "scores": {
        "gameplayLoopFit": 0,
        "playerFantasyFit": 0,
        "structureProgressionFit": 0,
        "presentationFit": 0,
        "toneFit": 0,
        "settingFit": 0,
        "commercialLaneFit": 0
      },
      "explanation": "string"
    }
  ],
  "influenceReferences": [
    {
      "title": "string",
      "category": "Influence Reference",
      "scores": {
        "gameplayLoopFit": 0,
        "playerFantasyFit": 0,
        "structureProgressionFit": 0,
        "presentationFit": 0,
        "toneFit": 0,
        "settingFit": 0,
        "commercialLaneFit": 0
      },
      "explanation": "string"
    }
  ],
  "rejects": [
    {
      "title": "string",
      "category": "Reject",
      "scores": {
        "gameplayLoopFit": 0,
        "playerFantasyFit": 0,
        "structureProgressionFit": 0,
        "presentationFit": 0,
        "toneFit": 0,
        "settingFit": 0,
        "commercialLaneFit": 0
      },
      "explanation": "string — explain clearly why this is a poor comp despite surface similarity"
    }
  ],
  "mechanicalMirrors": [
    {
      "title": "string",
      "category": "Mechanical Mirror",
      "scores": {
        "gameplayLoopFit": 0,
        "playerFantasyFit": 0,
        "structureProgressionFit": 0,
        "presentationFit": 0,
        "toneFit": 0,
        "settingFit": 0,
        "commercialLaneFit": 0
      },
      "explanation": "string"
    }
  ],
  "thematicRivals": [
    {
      "title": "string",
      "category": "Thematic Rival",
      "scores": {
        "gameplayLoopFit": 0,
        "playerFantasyFit": 0,
        "structureProgressionFit": 0,
        "presentationFit": 0,
        "toneFit": 0,
        "settingFit": 0,
        "commercialLaneFit": 0
      },
      "explanation": "string"
    }
  ],
  "competitiveGap": [
    {
      "title": "string — must match one of the top 3 direct competitors",
      "strength": "string — one thing this competitor does well",
      "weakness": "string — one weakness, complaint, or overused trope",
      "opportunity": "string — one opportunity for the subject game to stand out"
    }
  ]
}

Rules for list lengths:
- directCompetitors: exactly 3 entries
- adjacentCompetitors: exactly 3 entries
- influenceReferences: exactly 3 entries
- rejects: 2 to 3 entries
- mechanicalMirrors: 2 to 3 entries
- thematicRivals: 2 to 3 entries
- competitiveGap: exactly 3 entries, one for each direct competitor

If you genuinely lack enough evidence for the competitiveGap fields, use the string "Insufficient evidence" for that field only. Do not guess.`;

type CompetitorScores = {
  gameplayLoopFit: number;
  playerFantasyFit: number;
  structureProgressionFit: number;
  presentationFit: number;
  toneFit: number;
  settingFit: number;
  commercialLaneFit: number;
};

type CompetitorEntry = {
  title: string;
  category: string;
  scores: CompetitorScores;
  explanation: string;
};

type CompetitiveGapEntry = {
  title: string;
  strength: string;
  weakness: string;
  opportunity: string;
};

type CompetitiveAnalysisResult = {
  coreDNA: {
    coreMechanics: string;
    playerFantasy: string;
    narrativeTheme: string;
    aestheticStyle: string;
    pressureModel: string;
  };
  directCompetitors: CompetitorEntry[];
  adjacentCompetitors: CompetitorEntry[];
  influenceReferences: CompetitorEntry[];
  rejects: CompetitorEntry[];
  mechanicalMirrors: CompetitorEntry[];
  thematicRivals: CompetitorEntry[];
  competitiveGap: CompetitiveGapEntry[];
};

type CompetitiveAnalysisResponse = CompetitiveAnalysisResult & {
  remainingCredits?: number;
};

async function createRouteClient(accessToken?: string | null) {
  const cookieStore = await cookies();
  const authorizationHeader = accessToken ? `Bearer ${accessToken}` : null;

  return createSupabaseServerClient(
    cookieStore,
    authorizationHeader
      ? { global: { headers: { Authorization: authorizationHeader } } }
      : undefined
  );
}

async function requireAccess(accessToken?: string | null) {
  if (!hasSupabaseServerEnv) {
    return {
      ok: false as const,
      status: 500,
      error: "Supabase configuration error.",
      errorCode: "COMPETITIVE_ANALYSIS_ACCESS_FAILED",
    };
  }

  const supabase = await createRouteClient(accessToken);

  if (!supabase) {
    return {
      ok: false as const,
      status: 500,
      error: "Supabase configuration error.",
      errorCode: "COMPETITIVE_ANALYSIS_ACCESS_FAILED",
    };
  }

  const authResult = await requireVerifiedUser(supabase, accessToken);

  if (!authResult.ok) {
    return {
      ok: false as const,
      status: authResult.status,
      error: authResult.error,
      errorCode: "COMPETITIVE_ANALYSIS_ACCESS_FAILED",
    };
  }

  return { ok: true as const };
}

function getTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

function sanitizeScore(value: unknown): number {
  if (typeof value !== "number") return 0;
  return Math.max(0, Math.min(5, Math.round(value)));
}

function sanitizeScores(value: unknown): CompetitorScores | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  return {
    gameplayLoopFit: sanitizeScore(s.gameplayLoopFit),
    playerFantasyFit: sanitizeScore(s.playerFantasyFit),
    structureProgressionFit: sanitizeScore(s.structureProgressionFit),
    presentationFit: sanitizeScore(s.presentationFit),
    toneFit: sanitizeScore(s.toneFit),
    settingFit: sanitizeScore(s.settingFit),
    commercialLaneFit: sanitizeScore(s.commercialLaneFit),
  };
}

function sanitizeCompetitorEntry(value: unknown, expectedCategory: string): CompetitorEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const title = getTrimmedString(entry.title);
  const explanation = getTrimmedString(entry.explanation);
  const scores = sanitizeScores(entry.scores);

  if (!title || !explanation || !scores) return null;

  return {
    title,
    category: expectedCategory,
    scores,
    explanation,
  };
}

function sanitizeCompetitorList(value: unknown, expectedCategory: string): CompetitorEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeCompetitorEntry(item, expectedCategory))
    .filter((item): item is CompetitorEntry => item !== null);
}

function sanitizeCompetitiveGapEntry(value: unknown): CompetitiveGapEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const title = getTrimmedString(entry.title);
  const strength = getTrimmedString(entry.strength);
  const weakness = getTrimmedString(entry.weakness);
  const opportunity = getTrimmedString(entry.opportunity);

  if (!title || !strength || !weakness || !opportunity) return null;

  return { title, strength, weakness, opportunity };
}

function sanitizeResult(raw: unknown): CompetitiveAnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const dna = obj.coreDNA;
  if (!dna || typeof dna !== "object") return null;
  const dnaObj = dna as Record<string, unknown>;

  const coreMechanics = getTrimmedString(dnaObj.coreMechanics);
  const playerFantasy = getTrimmedString(dnaObj.playerFantasy);
  const narrativeTheme = getTrimmedString(dnaObj.narrativeTheme);
  const aestheticStyle = getTrimmedString(dnaObj.aestheticStyle);
  const pressureModel = getTrimmedString(dnaObj.pressureModel);

  if (!coreMechanics || !playerFantasy || !narrativeTheme || !aestheticStyle || !pressureModel) {
    return null;
  }

  const directCompetitors = sanitizeCompetitorList(obj.directCompetitors, "Direct Competitor");
  const adjacentCompetitors = sanitizeCompetitorList(obj.adjacentCompetitors, "Adjacent Competitor");
  const influenceReferences = sanitizeCompetitorList(obj.influenceReferences, "Influence Reference");
  const rejects = sanitizeCompetitorList(obj.rejects, "Reject");
  const mechanicalMirrors = sanitizeCompetitorList(obj.mechanicalMirrors, "Mechanical Mirror");
  const thematicRivals = sanitizeCompetitorList(obj.thematicRivals, "Thematic Rival");

  if (
    directCompetitors.length === 0 ||
    adjacentCompetitors.length === 0 ||
    influenceReferences.length === 0 ||
    rejects.length === 0
  ) {
    return null;
  }

  const competitiveGap: CompetitiveGapEntry[] = Array.isArray(obj.competitiveGap)
    ? obj.competitiveGap
        .map((item) => sanitizeCompetitiveGapEntry(item))
        .filter((item): item is CompetitiveGapEntry => item !== null)
    : [];

  return {
    coreDNA: { coreMechanics, playerFantasy, narrativeTheme, aestheticStyle, pressureModel },
    directCompetitors,
    adjacentCompetitors,
    influenceReferences,
    rejects,
    mechanicalMirrors,
    thematicRivals,
    competitiveGap,
  };
}

export async function POST(request: Request) {
  const routeStartedAt = performance.now();
  const accessToken = getSupabaseAccessTokenFromAuthorizationHeader(
    request.headers.get("authorization")
  );

  try {
    const accessStartedAt = performance.now();
    const access = await requireAccess(accessToken);
    logTiming("auth-access", accessStartedAt, { ok: access.ok });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, errorCode: access.errorCode },
        { status: access.status }
      );
    }

    let gamePitch: string;

    try {
      const body = (await request.json()) as { gamePitch?: unknown };
      const parsed = getTrimmedString(body?.gamePitch);
      if (!parsed) {
        return NextResponse.json(
          { error: "Provide a game description or Steam URL before running the analysis.", errorCode: "EMPTY_GAME_PITCH" },
          { status: 400 }
        );
      }
      if (parsed.length > 4000) {
        return NextResponse.json(
          { error: "Game description must be 4000 characters or fewer.", errorCode: "GAME_PITCH_TOO_LONG" },
          { status: 400 }
        );
      }
      gamePitch = parsed;
    } catch {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    const creditsGateStartedAt = performance.now();
    const creditsGate = await requireCompetitiveAnalysisCredits({
      source: "competitive-analysis/route",
      accessToken,
    });
    logTiming("credits-gate", creditsGateStartedAt, {
      ok: creditsGate.ok,
      status: creditsGate.ok ? 200 : creditsGate.status,
    });

    if (!creditsGate.ok) {
      return NextResponse.json(
        {
          error: creditsGate.error,
          errorCode:
            creditsGate.status === 403
              ? "INSUFFICIENT_COMPETITIVE_ANALYSIS_CREDITS"
              : "COMPETITIVE_ANALYSIS_CREDITS_GATE_FAILED",
        },
        { status: creditsGate.status }
      );
    }

    const openai = getOpenAIClient();
    const modelStartedAt = performance.now();

    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Game description:\n${gamePitch}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    logTiming("model-call", modelStartedAt);

    const rawContent = response.choices[0]?.message?.content ?? "";
    let parsedRaw: unknown;

    try {
      parsedRaw = JSON.parse(rawContent);
    } catch (parseError) {
      console.error("Competitive analysis returned invalid JSON:", parseError);
      const err = new Error("Analysis returned invalid JSON. Please try again.") as Error & {
        errorCode?: string;
      };
      err.errorCode = "INVALID_COMPETITIVE_ANALYSIS_JSON";
      throw err;
    }

    const result = sanitizeResult(parsedRaw);

    if (!result) {
      const err = new Error("Analysis returned invalid JSON. Please try again.") as Error & {
        errorCode?: string;
      };
      err.errorCode = "INVALID_COMPETITIVE_ANALYSIS_JSON";
      throw err;
    }

    const creditDeductionStartedAt = performance.now();
    const creditDeduction = await deductCompetitiveAnalysisCredit(
      creditsGate.userId,
      creditsGate.balance,
      { source: "competitive-analysis/route", accessToken }
    );
    logTiming("credit-deduction", creditDeductionStartedAt, {
      ok: creditDeduction.ok,
      status: creditDeduction.ok ? 200 : creditDeduction.status,
    });

    if (!creditDeduction.ok) {
      return NextResponse.json(
        {
          error: creditDeduction.error,
          errorCode: "COMPETITIVE_ANALYSIS_CREDIT_DEDUCTION_FAILED",
        },
        { status: creditDeduction.status }
      );
    }

    const responseBody: CompetitiveAnalysisResponse = {
      ...result,
      remainingCredits: creditDeduction.remainingBalance,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    if (
      error instanceof Error &&
      "errorCode" in error &&
      (error as Error & { errorCode?: string }).errorCode === "INVALID_COMPETITIVE_ANALYSIS_JSON"
    ) {
      return NextResponse.json(
        {
          error: "Analysis returned invalid JSON. Please try again.",
          errorCode: "INVALID_COMPETITIVE_ANALYSIS_JSON",
        },
        { status: 502 }
      );
    }

    console.error("Competitive analysis failed:", error);

    return NextResponse.json(
      {
        error: "We could not complete the analysis right now. Please try again.",
        errorCode: "COMPETITIVE_ANALYSIS_FAILED",
      },
      { status: 500 }
    );
  } finally {
    logTiming("total-route", routeStartedAt);
  }
}
