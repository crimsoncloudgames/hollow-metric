export const DEFAULT_PLATFORM_FEE_PERCENT = 30;
export const MAX_MONEY_VALUE = 1_000_000_000;
export const MAX_COPIES_VALUE = 1_000_000_000;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const sanitizeMoney = (value: number): number =>
  clampNumber(toFiniteNumber(value, 0), 0, MAX_MONEY_VALUE);

export const sanitizePercent = (value: number): number =>
  clampNumber(toFiniteNumber(value, 0), 0, 100);

export type RevenueBreakdown = {
  grossPrice: number;
  platformCut: number;
  netAfterPlatformCut: number;
  publisherTake: number;
  estimatedWithholdingTax: number;
  estimatedRefundImpact: number;
  developerNetPerCopy: number;
};

export const calculateRevenueBreakdown = (
  pricePerCopy: number,
  withholding: number,
  refundRate: number,
  publisherSplitPercent: number,
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT
): RevenueBreakdown => {
  const safePrice = sanitizeMoney(pricePerCopy);
  const safeWithholding = sanitizePercent(withholding);
  const safeRefundRate = sanitizePercent(refundRate);
  const safePublisherSplitPercent = sanitizePercent(publisherSplitPercent);
  const safePlatformFeePercent = sanitizePercent(platformFeePercent);

  const platformCut = safePrice * (safePlatformFeePercent / 100);
  const netAfterPlatformCut = safePrice - platformCut;
  const afterRefunds = netAfterPlatformCut * (1 - safeRefundRate / 100);
  const afterWithholding = afterRefunds * (1 - safeWithholding / 100);
  const publisherTake = afterWithholding * (safePublisherSplitPercent / 100);
  const developerNetPerCopy = afterWithholding - publisherTake;
  const estimatedWithholdingTax = afterRefunds - afterWithholding;
  const estimatedRefundImpact = netAfterPlatformCut - afterRefunds;

  return {
    grossPrice: safePrice,
    platformCut,
    netAfterPlatformCut,
    publisherTake,
    estimatedWithholdingTax,
    estimatedRefundImpact,
    developerNetPerCopy,
  };
};

export const calculateBreakEven = (
  totalCost: number,
  netRevenuePerCopy: number
): number | null => {
  const safeTotalCost = sanitizeMoney(totalCost);
  const safeNetRevenuePerCopy = toFiniteNumber(netRevenuePerCopy, 0);
  if (safeNetRevenuePerCopy <= 0) return null;

  const result = Math.ceil(safeTotalCost / safeNetRevenuePerCopy);
  if (!Number.isFinite(result) || result <= 0) return null;
  return clampNumber(result, 0, MAX_COPIES_VALUE);
};
