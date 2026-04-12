import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  deductGameIdeaGeneratorCredit,
  getSupabaseAccessTokenFromAuthorizationHeader,
  requireGameIdeaGeneratorCredits,
} from "@/lib/credits";
import { getOpenAIClient } from "@/lib/openai";
import {
  isTestingAdminEmail,
  TEMPORARY_TESTING_LOCK_MESSAGE,
} from "@/lib/testing-access";
import {
  createClient as createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/utils/supabase/server";

export const runtime = "nodejs";

const MODEL_NAME = "gpt-4o-mini";

const IDEA_ONE_SYSTEM_PROMPT = `You are an elite game designer creating a sharp, commercially strong, highly pitchable game concept.
Generate 1 game idea from the user inputs.
This version must be the cleaner, broader, more immediately marketable direction.
Make the player fantasy obvious fast.
Use every provided field materially.
If the inputs include Fighting and Stealth, both must be clearly present.
If Perspective is provided, explicitly state it.
If multiple endings is provided, explain how choices lead to different endings.
If stamina management is provided, explain how it creates gameplay pressure.
The hook must shape the game design.
The twist must change the player's role, progression, or structure in a meaningful way.
Avoid filler, vague prestige language, rhetorical questions, and generic wording.
Title must be strong, memorable, and commercially usable.
Summary must be 75 to 100 words.
Positioning must be 25 to 40 words.
Return strict JSON only in this shape:
{
  "title": "string",
  "summary": "string",
  "positioning": "string"
}`;

const IDEA_TWO_SYSTEM_PROMPT = `You are an elite game designer creating a bold, systems-distinct, high-concept game pitch.

Generate 1 game idea from the user's inputs.

This idea must NOT feel like a cleaner commercial action-adventure version.
This idea must instead reinterpret the same inputs through a different design lens.

Mandatory Idea Two design mandate:
- Make this the more unusual, more systems-led, more structurally distinct version.
- Shift emphasis away from broad cinematic adventure and toward a more distinctive gameplay identity.
- You may lean more into tactical structure, survival pressure, nonlinear progression, or systemic consequences, but you must still use the provided inputs.
- It must feel like a different product, not a darker rewrite.

Hard rules:
- Every provided field must materially affect the output.
- If Fighting is included, combat must be clearly present.
- If Stealth is included, stealth must be clearly present.
- If Perspective is included, explicitly state it.
- If multiple endings is included, explain how player choices or route structure create different endings.
- If stamina management is included, make it a real source of pressure.
- The emotional-biome hook must change the actual design, not just the setting flavor.
- The twist must reshape the player's role or progression in a meaningful way.
- Do not write this like a prestige narrative pitch.
- Avoid filler, vague atmosphere language, rhetorical questions, and generic “deep emotional journey” phrasing.
- Do not use the same title style as Idea One.
- Make the title stronger, sharper, and less abstract.

Difference requirements:
This idea must differ from Idea One in at least 5 of these:
- player fantasy
- progression structure
- combat rhythm
- stealth usage
- stamina pressure
- how multiple endings are achieved
- how the hook affects gameplay
- how the twist affects structure
- target audience framing
- tone of the pitch

Summary:
- 75 to 95 words max
- concrete and playable
- no fluff

Positioning:
- 22 to 38 words max
- specific audience
- specific differentiator

Return strict JSON only in this shape:
{
  "title": "string",
  "summary": "string",
  "positioning": "string"
}`;

const INPUT_KEYS = [
  "genre",
  "playerAction",
  "coreMechanics",
  "features",
  "setting",
  "mood",
  "twist",
  "hook",
  "audienceAngle",
  "perspective",
  "customIdea",
] as const;

const INPUT_LABELS: Record<(typeof INPUT_KEYS)[number], string> = {
  genre: "Genre",
  playerAction: "Player Action",
  coreMechanics: "Core Mechanics",
  features: "Features",
  setting: "Setting",
  mood: "Mood",
  twist: "Twist",
  hook: "Hook",
  audienceAngle: "Audience Angle",
  perspective: "Perspective",
  customIdea: "Your Own Game Idea",
};

type GameIdeaGenerationRequest = Partial<Record<(typeof INPUT_KEYS)[number], string>>;

type IdeaResponseItem = {
  title: string;
  summary: string;
  positioning: string;
};

type GameIdeaGenerationResponse = {
  ideaOne: IdeaResponseItem;
  ideaTwo: IdeaResponseItem;
  remainingCredits?: number;
};

async function createGameIdeaRouteClient(accessToken?: string | null) {
  const cookieStore = await cookies();
  const authorizationHeader = accessToken ? `Bearer ${accessToken}` : null;

  return createSupabaseServerClient(
    cookieStore,
    authorizationHeader
      ? {
          global: {
            headers: {
              Authorization: authorizationHeader,
            },
          },
        }
      : undefined
  );
}

async function requireGameIdeaGeneratorTestingAccess(accessToken?: string | null) {
  if (!hasSupabaseServerEnv) {
    return {
      ok: false as const,
      status: 500,
      error: "Supabase configuration error.",
      errorCode: "GAME_IDEA_GENERATION_ACCESS_FAILED",
    };
  }

  const supabase = await createGameIdeaRouteClient(accessToken);

  if (!supabase) {
    return {
      ok: false as const,
      status: 500,
      error: "Supabase configuration error.",
      errorCode: "GAME_IDEA_GENERATION_ACCESS_FAILED",
    };
  }

  const {
    data: { user },
    error: authError,
  } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized.",
      errorCode: "GAME_IDEA_GENERATION_ACCESS_FAILED",
    };
  }

  if (!isTestingAdminEmail(user.email)) {
    return {
      ok: false as const,
      status: 403,
      error: TEMPORARY_TESTING_LOCK_MESSAGE,
      errorCode: "GAME_IDEA_GENERATION_TESTING_LOCKED",
    };
  }

  return {
    ok: true as const,
  };
}

function getTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getProvidedInputs(payload: GameIdeaGenerationRequest) {
  return INPUT_KEYS.flatMap((key) => {
    const value = getTrimmedString(payload[key]);

    if (!value) {
      return [];
    }

    return [{ label: INPUT_LABELS[key], value }];
  });
}

function buildUserPrompt(payload: GameIdeaGenerationRequest) {
  const providedInputs = getProvidedInputs(payload);

  return [
    "User inputs:",
    ...providedInputs.map(({ label, value }) => `${label}: ${value}`),
  ].join("\n");
}

function buildIdeaTwoUserPrompt(sharedInputBlock: string, ideaOne: IdeaResponseItem) {
  return [
    sharedInputBlock,
    "",
    "Idea One already generated:",
    `Title: ${ideaOne.title}`,
    `Summary: ${ideaOne.summary}`,
    `Positioning: ${ideaOne.positioning}`,
    "",
    "Generate a clearly different concept from Idea One. Do not rewrite it, darken it, or merely reskin it.",
  ].join("\n");
}

function sanitizeIdeaResponseItem(value: unknown): IdeaResponseItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const title = getTrimmedString(candidate.title);
  const summary = getTrimmedString(candidate.summary);
  const positioning = getTrimmedString(candidate.positioning);

  if (!title || !summary || !positioning) {
    return null;
  }

  return {
    title,
    summary,
    positioning,
  };
}

async function generateSingleIdea(
  systemPrompt: string,
  userPrompt: string,
  ideaLabel: "Idea One" | "Idea Two"
) {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content ?? "";
  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(rawContent);
  } catch (parseError) {
    console.error(`${ideaLabel} generation returned invalid JSON:`, parseError);

    const error = new Error("Generation returned invalid JSON. Please try again.") as Error & {
      errorCode?: string;
    };
    error.errorCode = "INVALID_GAME_IDEA_JSON";
    throw error;
  }

  const sanitizedResponse = sanitizeIdeaResponseItem(parsedResponse);

  if (!sanitizedResponse) {
    const error = new Error("Generation returned invalid JSON. Please try again.") as Error & {
      errorCode?: string;
    };
    error.errorCode = "INVALID_GAME_IDEA_JSON";
    throw error;
  }

  return sanitizedResponse;
}

export async function POST(request: Request) {
  const accessToken = getSupabaseAccessTokenFromAuthorizationHeader(
    request.headers.get("authorization")
  );

  try {
    const testingAccess = await requireGameIdeaGeneratorTestingAccess(accessToken);

    if (!testingAccess.ok) {
      return NextResponse.json(
        {
          error: testingAccess.error,
          errorCode: testingAccess.errorCode,
        },
        { status: testingAccess.status }
      );
    }

    let payload: GameIdeaGenerationRequest;

    try {
      payload = (await request.json()) as GameIdeaGenerationRequest;
    } catch {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const providedInputs = getProvidedInputs(payload);

    if (providedInputs.length === 0) {
      return NextResponse.json(
        {
          error: "Add at least one field before generating a game idea.",
          errorCode: "EMPTY_GAME_IDEA_INPUT",
        },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY. Add it in the environment variables." },
        { status: 500 }
      );
    }

    const creditsGate = await requireGameIdeaGeneratorCredits({
      source: "game-idea-generator/route",
      accessToken,
    });

    if (!creditsGate.ok) {
      return NextResponse.json(
        {
          error: creditsGate.error,
          errorCode:
            creditsGate.status === 403
              ? "INSUFFICIENT_GAME_IDEA_CREDITS"
              : "GAME_IDEA_GENERATION_CREDITS_GATE_FAILED",
        },
        { status: creditsGate.status }
      );
    }

    const sharedInputBlock = buildUserPrompt(payload);
    const ideaOne = await generateSingleIdea(
      IDEA_ONE_SYSTEM_PROMPT,
      sharedInputBlock,
      "Idea One"
    );
    const ideaTwo = await generateSingleIdea(
      IDEA_TWO_SYSTEM_PROMPT,
      buildIdeaTwoUserPrompt(sharedInputBlock, ideaOne),
      "Idea Two"
    );

    const creditDeduction = await deductGameIdeaGeneratorCredit(
      creditsGate.userId,
      creditsGate.balance,
      {
        source: "game-idea-generator/route",
        accessToken,
      }
    );

    if (!creditDeduction.ok) {
      return NextResponse.json(
        {
          error: creditDeduction.error,
          errorCode: "GAME_IDEA_GENERATION_CREDIT_DEDUCTION_FAILED",
        },
        { status: creditDeduction.status }
      );
    }

    const responseBody: GameIdeaGenerationResponse = {
      ideaOne,
      ideaTwo,
      remainingCredits: creditDeduction.remainingBalance,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    if (
      error instanceof Error &&
      "errorCode" in error &&
      error.errorCode === "INVALID_GAME_IDEA_JSON"
    ) {
      return NextResponse.json(
        {
          error: "Generation returned invalid JSON. Please try again.",
          errorCode: "INVALID_GAME_IDEA_JSON",
        },
        { status: 502 }
      );
    }

    console.error("Game idea generation failed:", error);

    return NextResponse.json(
      {
        error: "We could not generate game ideas right now. Please try again.",
        errorCode: "GAME_IDEA_GENERATION_FAILED",
      },
      { status: 500 }
    );
  }
}