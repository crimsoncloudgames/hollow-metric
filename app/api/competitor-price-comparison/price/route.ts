import { NextRequest, NextResponse } from "next/server";

import {
  buildPricingFromCompetitors,
  type FoundCompetitor,
} from "../shared";
import {
  deductCompetitorPriceComparisonCredit,
  getSupabaseAccessTokenFromAuthorizationHeader,
  requireCompetitorPriceComparisonCredits,
} from "@/lib/credits";

export const runtime = "nodejs";

type CompetitorPriceComparisonErrorCode =
  | "COMPETITOR_CREDIT_RACE"
  | "COMPETITOR_CREDIT_DEDUCTION_FAILED";

type PriceCompetitorRequest = {
  sourceGameTitle?: string;
  sourceAppId?: string;
  competitors?: unknown;
  selectedCompetitorAppIds?: unknown;
};

function jsonError(
  message: string,
  status: number,
  code?: CompetitorPriceComparisonErrorCode
) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

function parseCompetitors(value: unknown): FoundCompetitor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const appId = typeof record.appId === "string" ? record.appId.trim() : "";
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const currentPrice =
        typeof record.currentPrice === "string" ? record.currentPrice.trim() : "Price unavailable";
      const originalListPrice =
        typeof record.originalListPrice === "string"
          ? record.originalListPrice.trim()
          : "Price unavailable";
      const shortDescription =
        typeof record.shortDescription === "string" ? record.shortDescription.trim() : "";
      const genres = Array.isArray(record.genres)
        ? record.genres.flatMap((genre) => (typeof genre === "string" ? [genre.trim()] : []))
        : [];
      const categories = Array.isArray(record.categories)
        ? record.categories.flatMap((category) =>
            typeof category === "string" ? [category.trim()] : []
          )
        : [];
      const fitLabel =
        record.fitLabel === "Strong" || record.fitLabel === "Medium" || record.fitLabel === "Weak"
          ? record.fitLabel
          : "Weak";
      const fitScore =
        typeof record.fitScore === "number" && Number.isFinite(record.fitScore)
          ? Math.max(0, Math.min(100, Math.round(record.fitScore)))
          : 0;
      const reason = typeof record.reason === "string" ? record.reason.trim() : "";
      const selected = record.selected === true;

      if (!appId || !title) {
        return null;
      }

      return {
        appId,
        title,
        currentPrice,
        originalListPrice,
        shortDescription,
        genres,
        categories,
        fitLabel,
        fitScore,
        reason,
        selected,
      };
    })
    .filter((entry): entry is FoundCompetitor => Boolean(entry));
}

function parseSelectedCompetitorAppIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    const appId = entry.trim();

    if (!appId || seen.has(appId)) {
      return [];
    }

    seen.add(appId);
    return [appId];
  });
}

export async function POST(request: NextRequest) {
  const accessToken = getSupabaseAccessTokenFromAuthorizationHeader(
    request.headers.get("authorization")
  );

  const creditsGate = await requireCompetitorPriceComparisonCredits({
    source: "competitor-price-comparison/price",
    accessToken,
  });

  if (!creditsGate.ok) {
    return jsonError(creditsGate.error, creditsGate.status);
  }

  let body: PriceCompetitorRequest;

  try {
    body = (await request.json()) as PriceCompetitorRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const sourceGameTitle = typeof body.sourceGameTitle === "string" ? body.sourceGameTitle.trim() : "";
  const sourceAppId = typeof body.sourceAppId === "string" ? body.sourceAppId.trim() : "";
  const competitors = parseCompetitors(body.competitors);
  const selectedCompetitorAppIds = parseSelectedCompetitorAppIds(body.selectedCompetitorAppIds);

  if (!sourceGameTitle || !sourceAppId) {
    return jsonError("Source game details are required.", 400);
  }

  if (competitors.length < 2) {
    return jsonError("At least two validated competitors are required.", 400);
  }

  if (selectedCompetitorAppIds.length < 2 || selectedCompetitorAppIds.length > 3) {
    return jsonError("Between 2 and 3 explicit selected competitor app IDs are required.", 400);
  }

  try {
    const pricingResult = await buildPricingFromCompetitors(
      sourceGameTitle,
      sourceAppId,
      competitors,
      selectedCompetitorAppIds
    );

    const recommendedPrice = pricingResult.pricing.recommended_price;
    const rangeMin = pricingResult.pricing.suggested_price_range_min;
    const rangeMax = pricingResult.pricing.suggested_price_range_max;

    const minPrice = pricingResult.pricing.minimum_price;
    const maxPrice = pricingResult.pricing.maximum_price;
    const rationale = pricingResult.pricing.pricing_rationale;

    const hasUsablePricingOutput = Boolean(
      pricingResult.comparables.length >= 2 &&
        recommendedPrice.trim() &&
        rangeMin.trim() &&
        rangeMax.trim() &&
        minPrice.trim() &&
        maxPrice.trim() &&
        rationale.trim()
    );

    if (!hasUsablePricingOutput) {
      return jsonError("Insufficient priced competitor data to calculate a recommendation.", 502);
    }

    const deductionResult = await deductCompetitorPriceComparisonCredit(
      creditsGate.userId,
      creditsGate.balance,
      {
        source: "competitor-price-comparison/price",
        accessToken,
      }
    );

    if (!deductionResult.ok) {
      return jsonError(
        deductionResult.error,
        deductionResult.status,
        deductionResult.status === 409
          ? "COMPETITOR_CREDIT_RACE"
          : "COMPETITOR_CREDIT_DEDUCTION_FAILED"
      );
    }

    return NextResponse.json({
      sourceGameTitle: pricingResult.sourceGameTitle,
      comparables: pricingResult.comparables,
      disclaimer: pricingResult.disclaimer,
      minimum_price: pricingResult.pricing.minimum_price,
      maximum_price: pricingResult.pricing.maximum_price,
      suggested_price_range_min: pricingResult.pricing.suggested_price_range_min,
      suggested_price_range_max: pricingResult.pricing.suggested_price_range_max,
      recommended_price: pricingResult.pricing.recommended_price,
      pricing_rationale: pricingResult.pricing.pricing_rationale,
      remainingCredits: deductionResult.remainingBalance,
      lowConfidence: pricingResult.lowConfidence,
    });
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      const message = error.message.trim();

      if (
        message === "Between 2 and 3 explicit selected competitors are required for pricing." ||
        message === "Selected competitors must be present in the validated competitors list." ||
        message === "Selected competitors failed validation checks for pricing." ||
        message === "Insufficient priced competitors to build a recommendation." ||
        message === "Insufficient priced competitor data to calculate a recommendation."
      ) {
        return jsonError(message, 502);
      }

      return jsonError(message, 500);
    }

    return jsonError("We couldn't calculate competitor pricing right now. Please try again.", 500);
  }
}
