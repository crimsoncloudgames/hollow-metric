export const UI_CREDITS_PLACEHOLDER_BALANCE = 0;

export function normalizeCreditsBalance(balance: unknown): number {
  return typeof balance === "number" && Number.isFinite(balance)
    ? Math.max(0, Math.floor(balance))
    : UI_CREDITS_PLACEHOLDER_BALANCE;
}

export function formatCreditsBalanceLabel(balance = UI_CREDITS_PLACEHOLDER_BALANCE): string {
  const normalizedBalance = normalizeCreditsBalance(balance);
  return `Credits: ${normalizedBalance}`;
}