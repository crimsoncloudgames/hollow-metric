const CREDIT_PACK_BY_PRICE_ID = new Map<string, number>(
  [
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_5?.trim(), 5],
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_10?.trim(), 10],
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_25?.trim(), 25],
  ].filter((entry): entry is [string, number] => Boolean(entry[0]))
);

export function getCreditsForPriceId(priceId: string): number {
  const normalizedPriceId = priceId.trim();
  return CREDIT_PACK_BY_PRICE_ID.get(normalizedPriceId) ?? 0;
}
