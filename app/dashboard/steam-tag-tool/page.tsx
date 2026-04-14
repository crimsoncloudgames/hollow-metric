"use client";

import Image from "next/image";
import { useState } from "react";
import { dispatchCreditsBalanceUpdated } from "@/lib/credits-ui";
import { createClient } from "@/utils/supabase/client";

type InputMode = "steam-page" | "manual";

type ResultTab = "tags" | "recommendation";

type ManualModeRequest = {
  gameTitle: string;
  genre: string;
  subgenre: string;
  coreGameplayLoop: string;
  whatThePlayerDoes: string;
  mainObjectiveOrProgression: string;
  perspectiveOrCameraStyle: string;
  playerCountOrPlayModes: string;
  coreMechanics: string;
  settingOrTheme: string;
  toneOrMood: string;
  comparableGames: string;
  extraNotes: string;
};

type ManualModeResponse = {
  gameTitle?: string;
  tags: string[];
  recommendation: string;
  remainingCredits?: number;
};

type SteamPageModeResponse = {
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

type SteamTagBucketKey = "goodTags" | "suggestedTags" | "weakTags" | "reviewTags";

type ManualField = {
  id: keyof ManualModeRequest;
  label: string;
  placeholder: string;
  kind: "input" | "textarea" | "select";
  optional?: boolean;
  rows?: number;
  options?: string[];
};

const manualFields: ManualField[] = [
  {
    id: "gameTitle",
    label: "Game title",
    placeholder: "Optional working title",
    kind: "input",
    optional: true,
  },
  {
    id: "genre",
    label: "Genre",
    placeholder: "Action RPG, Survival Horror, City Builder",
    kind: "input",
  },
  {
    id: "subgenre",
    label: "Subgenre",
    placeholder: "Optional niche or hybrid category",
    kind: "input",
    optional: true,
  },
  {
    id: "coreGameplayLoop",
    label: "Core gameplay loop",
    placeholder: "Describe the repeatable loop players spend most of their time doing.",
    kind: "textarea",
    rows: 4,
  },
  {
    id: "whatThePlayerDoes",
    label: "What the player does",
    placeholder: "Describe the moment-to-moment actions, decisions, and interactions.",
    kind: "textarea",
    rows: 4,
  },
  {
    id: "mainObjectiveOrProgression",
    label: "Main objective or progression",
    placeholder: "Explain the core goal, progression path, or win condition.",
    kind: "textarea",
    rows: 4,
  },
  {
    id: "perspectiveOrCameraStyle",
    label: "Perspective or camera style",
    placeholder: "Select a perspective",
    kind: "select",
    options: ["", "First-person", "Third person", "Top-down", "Isometric", "Side view", "2.5D", "Other"],
  },
  {
    id: "playerCountOrPlayModes",
    label: "Player count or play modes",
    placeholder: "Single-player, online co-op, local versus, MMO, etc.",
    kind: "input",
  },
  {
    id: "coreMechanics",
    label: "Core mechanics",
    placeholder: "List the systems that define play: deckbuilding, stealth, crafting, tactics, physics, farming, and so on.",
    kind: "textarea",
    rows: 4,
  },
  {
    id: "settingOrTheme",
    label: "Setting or theme",
    placeholder: "Sci-fi frontier, gothic city, cozy village, post-collapse highway, etc.",
    kind: "input",
  },
  {
    id: "toneOrMood",
    label: "Tone or mood",
    placeholder: "Tense, cozy, bleak, chaotic, comedic, mysterious, and so on.",
    kind: "input",
  },
  {
    id: "comparableGames",
    label: "Comparable games",
    placeholder: "Optional reference points players would immediately understand.",
    kind: "textarea",
    rows: 3,
    optional: true,
  },
  {
    id: "extraNotes",
    label: "Extra notes",
    placeholder: "Optional supporting details that may affect positioning or expectations.",
    kind: "textarea",
    rows: 4,
    optional: true,
  },
];

const placeholderTags = ["Action", "Adventure", "Singleplayer", "Atmospheric", "Story Rich", "Exploration"];
const placeholderSteamTitle = "Game Title Placeholder";
const placeholderRecommendation =
  "The recommendation tab will summarize the strongest genre, mechanic, and setting signals, and call out any extra details worth confirming once a result is generated.";
const placeholderSteamDescription =
  "This card will show the detected Steam page title, capsule image, and short description.";

const steamPreviewBuckets: Record<SteamTagBucketKey, string[]> = {
  goodTags: ["Action", "Adventure", "Puzzle"],
  suggestedTags: ["First-Person", "Physics", "Sci-fi"],
  weakTags: ["Atmospheric"],
  reviewTags: ["Story Rich"],
};

const steamTagBucketMeta: Record<SteamTagBucketKey, { label: string; description: string; sectionClassName: string; chipClassName: string; emptyText: string }> = {
  goodTags: {
    label: "Green Tags",
    description: "Already on Steam and strongly aligned with the game’s core identity.",
    sectionClassName: "border-emerald-500/30 bg-emerald-500/10",
    chipClassName: "border-emerald-400/35 bg-emerald-950/80 text-emerald-100",
    emptyText: "No clearly strong existing Steam tags were identified.",
  },
  suggestedTags: {
    label: "Blue Tags",
    description: "Missing tags that could improve discoverability based on the extracted evidence.",
    sectionClassName: "border-sky-500/30 bg-sky-500/10",
    chipClassName: "border-sky-400/35 bg-sky-950/80 text-sky-100",
    emptyText: "No additional suggested tags were identified.",
  },
  weakTags: {
    label: "Red Tags",
    description: "Existing Steam tags that look weak, too broad, or poorly supported.",
    sectionClassName: "border-rose-500/30 bg-rose-500/10",
    chipClassName: "border-rose-400/35 bg-rose-950/80 text-rose-100",
    emptyText: "No clearly weak tags were flagged for removal.",
  },
  reviewTags: {
    label: "Yellow Tags",
    description: "Existing Steam tags that may fit, but deserve a manual accuracy check.",
    sectionClassName: "border-amber-500/30 bg-amber-500/10",
    chipClassName: "border-amber-400/35 bg-amber-950/80 text-amber-100",
    emptyText: "No manual-review tags were flagged.",
  },
};

const emptyManualValues: ManualModeRequest = {
  gameTitle: "",
  genre: "",
  subgenre: "",
  coreGameplayLoop: "",
  whatThePlayerDoes: "",
  mainObjectiveOrProgression: "",
  perspectiveOrCameraStyle: "",
  playerCountOrPlayModes: "",
  coreMechanics: "",
  settingOrTheme: "",
  toneOrMood: "",
  comparableGames: "",
  extraNotes: "",
};

function hasDescriptiveManualInput(values: ManualModeRequest): boolean {
  return [
    values.genre,
    values.subgenre,
    values.coreGameplayLoop,
    values.whatThePlayerDoes,
    values.mainObjectiveOrProgression,
    values.perspectiveOrCameraStyle,
    values.playerCountOrPlayModes,
    values.coreMechanics,
    values.settingOrTheme,
    values.toneOrMood,
    values.comparableGames,
    values.extraNotes,
  ].some((value) => value.trim().length > 0);
}

function trimManualValues(values: ManualModeRequest): ManualModeRequest {
  return {
    gameTitle: values.gameTitle.trim(),
    genre: values.genre.trim(),
    subgenre: values.subgenre.trim(),
    coreGameplayLoop: values.coreGameplayLoop.trim(),
    whatThePlayerDoes: values.whatThePlayerDoes.trim(),
    mainObjectiveOrProgression: values.mainObjectiveOrProgression.trim(),
    perspectiveOrCameraStyle: values.perspectiveOrCameraStyle.trim(),
    playerCountOrPlayModes: values.playerCountOrPlayModes.trim(),
    coreMechanics: values.coreMechanics.trim(),
    settingOrTheme: values.settingOrTheme.trim(),
    toneOrMood: values.toneOrMood.trim(),
    comparableGames: values.comparableGames.trim(),
    extraNotes: values.extraNotes.trim(),
  };
}

function isManualModeResponse(value: unknown): value is ManualModeResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    (record.gameTitle === undefined || typeof record.gameTitle === "string") &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === "string") &&
    typeof record.recommendation === "string" &&
    (record.remainingCredits === undefined || typeof record.remainingCredits === "number")
  );
}

function isSteamPageModeResponse(value: unknown): value is SteamPageModeResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const areStringArrays = (field: unknown) => Array.isArray(field) && field.every((item) => typeof item === "string");

  return (
    typeof record.appId === "string" &&
    typeof record.title === "string" &&
    typeof record.capsuleUrl === "string" &&
    typeof record.shortDescription === "string" &&
    typeof record.aboutThisGame === "string" &&
    areStringArrays(record.currentTags) &&
    areStringArrays(record.goodTags) &&
    areStringArrays(record.suggestedTags) &&
    areStringArrays(record.weakTags) &&
    areStringArrays(record.reviewTags) &&
    typeof record.recommendation === "string" &&
    (record.remainingCredits === undefined || typeof record.remainingCredits === "number")
  );
}

function isNonPlaceholderText(value: string, placeholderValues: string[] = []): boolean {
  const normalizedValue = value.trim().toLowerCase();

  return Boolean(normalizedValue) && !placeholderValues.some((entry) => normalizedValue === entry.trim().toLowerCase());
}

function isHttpUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function hasCompleteSteamPageModeResult(result: SteamPageModeResponse): boolean {
  const classifiedCurrentTagCount = result.goodTags.length + result.weakTags.length + result.reviewTags.length;

  return (
    isNonPlaceholderText(result.title, [placeholderSteamTitle]) &&
    isHttpUrl(result.capsuleUrl) &&
    isNonPlaceholderText(result.shortDescription, [placeholderSteamDescription]) &&
    result.currentTags.length > 0 &&
    classifiedCurrentTagCount === result.currentTags.length &&
    isNonPlaceholderText(result.recommendation, [placeholderRecommendation])
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not generate tags right now. Please try again.";
}

async function buildSteamTagToolRequestHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const supabase = createClient();

  if (!supabase) {
    return headers;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token?.trim();

  if (process.env.NODE_ENV !== "production") {
    console.info("Steam Tag Tool request auth", {
      source: "steam-tag-tool-page",
      userId: session?.user?.id ?? null,
      hasAccessToken: Boolean(accessToken),
    });
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      {optional ? <span className="text-xs font-medium text-slate-500">Optional</span> : null}
    </div>
  );
}

function PlaceholderTagChips() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {placeholderTags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function ResultTabs({ activeTab, onChange }: { activeTab: ResultTab; onChange: (tab: ResultTab) => void }) {
  return (
    <div className="mt-5 inline-flex rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
      <button
        type="button"
        onClick={() => onChange("tags")}
        className={[
          "rounded-xl px-4 py-2 text-sm font-semibold transition",
          activeTab === "tags" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white",
        ].join(" ")}
      >
        Tags
      </button>
      <button
        type="button"
        onClick={() => onChange("recommendation")}
        className={[
          "rounded-xl px-4 py-2 text-sm font-semibold transition",
          activeTab === "recommendation"
            ? "bg-blue-600 text-white"
            : "text-slate-300 hover:bg-slate-900 hover:text-white",
        ].join(" ")}
      >
        Recommendation
      </button>
    </div>
  );
}

function RecommendationSummaryCard({ summary }: { summary: string }) {
  return (
    <div className="mt-4 rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Recommendation Summary</p>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">{summary}</p>
    </div>
  );
}

function SteamTagBucketSection({ bucket, tags }: { bucket: SteamTagBucketKey; tags: string[] }) {
  const meta = steamTagBucketMeta[bucket];

  return (
    <div className={["rounded-3xl border p-5", meta.sectionClassName].join(" ")}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-950/0">&nbsp;</p>
      <p className="text-sm font-bold text-white">{meta.label}</p>
      <p className="mt-1 text-sm text-slate-300">{meta.description}</p>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={`${bucket}-${tag}`} className={["rounded-full border px-3 py-1.5 text-xs font-semibold", meta.chipClassName].join(" ")}>
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-300">{meta.emptyText}</p>
      )}
    </div>
  );
}

export default function SteamTagToolPage() {
  const [inputMode, setInputMode] = useState<InputMode>("steam-page");
  const [resultTab, setResultTab] = useState<ResultTab>("tags");
  const [steamUrl, setSteamUrl] = useState("");
  const [steamResult, setSteamResult] = useState<SteamPageModeResponse | null>(null);
  const [steamError, setSteamError] = useState<string | null>(null);
  const [isSteamLoading, setIsSteamLoading] = useState(false);
  const [hasFreshSteamSuccess, setHasFreshSteamSuccess] = useState(false);
  const [manualValues, setManualValues] = useState<ManualModeRequest>(emptyManualValues);
  const [manualResult, setManualResult] = useState<ManualModeResponse | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [hasFreshManualSuccess, setHasFreshManualSuccess] = useState(false);

  const isSteamPageMode = inputMode === "steam-page";

  const handleManualValueChange = (field: keyof ManualModeRequest, value: string) => {
    setManualValues((current) => ({
      ...current,
      [field]: value,
    }));
    setHasFreshManualSuccess(false);
  };

  const handleSteamSubmit = async () => {
    const trimmedUrl = steamUrl.trim();

    if (!trimmedUrl) {
      setSteamError("Paste a valid Steam store URL before generating tags.");
      setSteamResult(null);
      setHasFreshSteamSuccess(false);
      return;
    }

    setIsSteamLoading(true);
    setSteamError(null);
    setSteamResult(null);
    setHasFreshSteamSuccess(false);

    try {
      const headers = await buildSteamTagToolRequestHeaders();
      const response = await fetch("/api/steam-tag-tool/steam-page", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const responseBody = (await response.json()) as unknown;

      if (!response.ok) {
        const message =
          responseBody &&
          typeof responseBody === "object" &&
          typeof (responseBody as { error?: unknown }).error === "string"
            ? (responseBody as { error: string }).error
            : "We could not analyze that Steam page right now. Please try again.";

        throw new Error(message);
      }

      if (!isSteamPageModeResponse(responseBody)) {
        throw new Error("The Steam page analyzer returned an unexpected response.");
      }

      const completeSteamResult: SteamPageModeResponse = {
        appId: responseBody.appId,
        title: responseBody.title.trim(),
        capsuleUrl: responseBody.capsuleUrl.trim(),
        shortDescription: responseBody.shortDescription.trim(),
        aboutThisGame: responseBody.aboutThisGame.trim(),
        currentTags: responseBody.currentTags,
        goodTags: responseBody.goodTags,
        suggestedTags: responseBody.suggestedTags,
        weakTags: responseBody.weakTags,
        reviewTags: responseBody.reviewTags,
        recommendation: responseBody.recommendation.trim(),
        remainingCredits:
          typeof responseBody.remainingCredits === "number"
            ? responseBody.remainingCredits
            : undefined,
      };

      if (!hasCompleteSteamPageModeResult(completeSteamResult)) {
        throw new Error("Steam page analysis completed, but the final result was incomplete. Please try again.");
      }

      setSteamResult(completeSteamResult);
      setHasFreshSteamSuccess(true);
      setResultTab("tags");

      if (typeof completeSteamResult.remainingCredits === "number") {
        dispatchCreditsBalanceUpdated({ balance: completeSteamResult.remainingCredits });
      }
    } catch (error) {
      setSteamError(getErrorMessage(error));
      setHasFreshSteamSuccess(false);
    } finally {
      setIsSteamLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    const payload = trimManualValues(manualValues);

    if (!hasDescriptiveManualInput(payload)) {
      setManualError("Add at least one descriptive field before generating tags.");
      setManualResult(null);
      setHasFreshManualSuccess(false);
      return;
    }

    setIsManualLoading(true);
    setManualError(null);
    setHasFreshManualSuccess(false);
    setManualResult(null);

    try {
      const headers = await buildSteamTagToolRequestHeaders();
      const response = await fetch("/api/steam-tag-tool/manual", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json()) as unknown;

      if (!response.ok) {
        const message =
          responseBody &&
          typeof responseBody === "object" &&
          typeof (responseBody as { error?: unknown }).error === "string"
            ? (responseBody as { error: string }).error
            : "We could not generate tags right now. Please try again.";

        throw new Error(message);
      }

      if (!isManualModeResponse(responseBody)) {
        throw new Error("The tag generator returned an unexpected response.");
      }

      setManualResult({
        gameTitle: responseBody.gameTitle?.trim(),
        tags: responseBody.tags,
        recommendation: responseBody.recommendation.trim(),
      });

      if (typeof responseBody.remainingCredits === "number") {
        dispatchCreditsBalanceUpdated({ balance: responseBody.remainingCredits });
      }

      setHasFreshManualSuccess(true);
      setResultTab("tags");
    } catch (error) {
      setManualError(getErrorMessage(error));
      setHasFreshManualSuccess(false);
    } finally {
      setIsManualLoading(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Steam Tag Tool</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Steam Tag Tool</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
          A simple tool to generate the best Steam tags for a game.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setInputMode("steam-page");
              setSteamError(null);
              setManualError(null);
              setHasFreshManualSuccess(false);
            }}
            className={[
              "rounded-2xl border px-4 py-4 text-left transition",
              isSteamPageMode
                ? "border-blue-500/40 bg-blue-500/10 text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.18)]"
                : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Steam page mode</p>
            <p className="mt-1 text-xs text-inherit/80">Use a Steam store page as the evidence source.</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputMode("manual");
              setSteamError(null);
              setManualError(null);
              setHasFreshManualSuccess(false);
            }}
            className={[
              "rounded-2xl border px-4 py-4 text-left transition",
              !isSteamPageMode
                ? "border-blue-500/40 bg-blue-500/10 text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.18)]"
                : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Manual mode</p>
            <p className="mt-1 text-xs text-inherit/80">Describe the game yourself and shape the inputs directly.</p>
          </button>
        </div>

        {isSteamPageMode ? (
          <form
            className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSteamSubmit();
            }}
          >
            <div className="space-y-2">
              <FieldLabel label="Steam store URL" />
              <input
                id="steam-url-input"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://store.steampowered.com/app/620/Portal_2/"
                value={steamUrl}
                onChange={(event) => setSteamUrl(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-slate-500">
                Paste a Steam store page URL to pull the title, capsule, current Steam tags, and store descriptions automatically.
              </p>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSteamLoading}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
              >
                {isSteamLoading ? "Analyzing Steam Page..." : "Generate Tags"}
              </button>
              <p className="text-xs text-slate-500">
                {isSteamLoading
                  ? "Fetching the store page, current tags, and recommendation summary."
                  : "Evaluates current Steam tags and suggests additions or removals."}
              </p>
            </div>

            {steamError ? (
              <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {steamError}
              </div>
            ) : null}
          </form>
        ) : (
          <form
            className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleManualSubmit();
            }}
          >
            <div className="mb-6 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
              Sparse input is allowed. A genre or short concept is enough to get started; adding more fields improves the final tags and
              recommendation.
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {manualFields.map((field) => {
                const baseClassName =
                  "w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

                return (
                  <div
                    key={field.id}
                    className={field.kind === "textarea" && field.rows && field.rows > 3 ? "lg:col-span-2 space-y-2" : "space-y-2"}
                  >
                    <FieldLabel label={field.label} optional={field.optional} />

                    {field.kind === "textarea" ? (
                      <textarea
                        id={field.id}
                        rows={field.rows}
                        placeholder={field.placeholder}
                        value={manualValues[field.id]}
                        onChange={(event) => handleManualValueChange(field.id, event.target.value)}
                        className={baseClassName}
                      />
                    ) : null}

                    {field.kind === "input" ? (
                      <input
                        id={field.id}
                        type="text"
                        placeholder={field.placeholder}
                        value={manualValues[field.id]}
                        onChange={(event) => handleManualValueChange(field.id, event.target.value)}
                        className={baseClassName}
                      />
                    ) : null}

                    {field.kind === "select" ? (
                      <select
                        id={field.id}
                        value={manualValues[field.id]}
                        onChange={(event) => handleManualValueChange(field.id, event.target.value)}
                        className={baseClassName}
                      >
                        {(field.options ?? []).map((option) => (
                          <option key={option || "placeholder"} value={option}>
                            {option || field.placeholder}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={isManualLoading}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
              >
                {isManualLoading ? "Generating Tags..." : "Generate Tags"}
              </button>
              <p className="text-xs text-slate-500">
                {isManualLoading
                  ? "Using your inputs plus broad genre-pattern inference when details are sparse."
                  : "Uses your inputs plus broad genre-pattern inference when details are sparse."}
              </p>
            </div>

            {manualError ? (
              <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {manualError}
              </div>
            ) : null}
          </form>
        )}
      </div>

      {isSteamPageMode ? (
        <div
          className={[
            "overflow-hidden rounded-3xl border transition-shadow",
            hasFreshSteamSuccess && steamResult && !isSteamLoading
              ? "border-sky-400/55 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_42%),linear-gradient(180deg,rgba(8,47,73,0.72),rgba(15,23,42,0.86)_72%,rgba(15,23,42,0.96)_100%)] shadow-[0_0_44px_rgba(14,165,233,0.18)]"
              : "border-slate-800 bg-slate-900/60",
          ].join(" ")}
        >
          <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="border-b border-slate-800 bg-slate-950/70 p-5 lg:border-b-0 lg:border-r">
              {steamResult?.capsuleUrl ? (
                <Image
                  src={steamResult.capsuleUrl}
                  alt={`${steamResult.title} capsule art`}
                  width={460}
                  height={215}
                  className="h-auto w-full rounded-2xl border border-slate-800 object-cover"
                />
              ) : (
                <div className="flex aspect-[460/215] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Capsule Image
                </div>
              )}
              <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-slate-500">Found game title</p>
              <h2 className="mt-2 text-2xl font-black text-white">{steamResult?.title || "Game Title Placeholder"}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {steamResult?.shortDescription || "This card will show the detected Steam page title, capsule image, and short description."}
              </p>

              {steamResult ? (
                <div className="mt-4 space-y-3 text-sm text-slate-400">
                  <p>
                    <span className="font-semibold text-slate-200">Current Steam tags:</span> {steamResult.currentTags.length}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-200">App ID:</span> {steamResult.appId}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                  {steamResult ? "Steam Page Tag Review" : "Result Preview"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {steamResult
                    ? "Green tags are strong current matches, blue tags are recommended additions, red tags look weak, and yellow tags deserve manual review."
                    : "Final tag output and a short recommendation summary will appear here once the page mode is wired."}
                </p>
                <ResultTabs activeTab={resultTab} onChange={setResultTab} />

                {resultTab === "tags" ? (
                  steamResult ? (
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <SteamTagBucketSection bucket="goodTags" tags={steamResult.goodTags} />
                      <SteamTagBucketSection bucket="suggestedTags" tags={steamResult.suggestedTags} />
                      <SteamTagBucketSection bucket="weakTags" tags={steamResult.weakTags} />
                      <SteamTagBucketSection bucket="reviewTags" tags={steamResult.reviewTags} />
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <SteamTagBucketSection bucket="goodTags" tags={steamPreviewBuckets.goodTags} />
                      <SteamTagBucketSection bucket="suggestedTags" tags={steamPreviewBuckets.suggestedTags} />
                      <SteamTagBucketSection bucket="weakTags" tags={steamPreviewBuckets.weakTags} />
                      <SteamTagBucketSection bucket="reviewTags" tags={steamPreviewBuckets.reviewTags} />
                    </div>
                  )
                ) : (
                  <RecommendationSummaryCard summary={steamResult?.recommendation || placeholderRecommendation} />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={[
            "rounded-3xl border p-6 sm:p-8 transition-shadow",
            hasFreshManualSuccess && manualResult && !isManualLoading
              ? "border-emerald-400/55 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_42%),linear-gradient(180deg,rgba(6,78,59,0.68),rgba(8,47,73,0.58)_28%,rgba(15,23,42,0.9)_72%,rgba(15,23,42,0.96)_100%)] shadow-[0_0_44px_rgba(34,197,94,0.22)]"
              : "border-slate-800 bg-slate-900/60",
          ].join(" ")}
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">{manualResult ? "Result Preview" : "Placeholder Result"}</p>
          <h2 className="mt-3 text-2xl font-black text-white">
            {manualResult?.gameTitle || (manualResult ? "Untitled game concept" : "Game Title Placeholder")}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {manualResult
              ? "Switch between the final tag list and a short recommendation summary generated from the manual evidence above."
              : "Manual mode will show the provided title if one is entered, plus the final tag list and recommendation summary."}
          </p>
          <ResultTabs activeTab={resultTab} onChange={setResultTab} />

          {resultTab === "tags" ? (
            manualResult ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {manualResult.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <PlaceholderTagChips />
            )
          ) : (
            <RecommendationSummaryCard summary={manualResult?.recommendation || placeholderRecommendation} />
          )}
        </div>
      )}
    </section>
  );
}