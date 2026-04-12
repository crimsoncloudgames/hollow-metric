export const UI_CREDITS_PLACEHOLDER_BALANCE = 0;
export const CREDITS_BALANCE_UPDATED_EVENT = "hollowmetric:credits-balance-updated";

export type CreditsBalanceUpdatedDetail = {
  balance?: number;
};

export function normalizeCreditsBalance(balance: unknown): number {
  return typeof balance === "number" && Number.isFinite(balance)
    ? Math.max(0, Math.floor(balance))
    : UI_CREDITS_PLACEHOLDER_BALANCE;
}

export function dispatchCreditsBalanceUpdated(detail: CreditsBalanceUpdatedDetail = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(CREDITS_BALANCE_UPDATED_EVENT, { detail }));
}

export function formatCreditsBalanceLabel(balance = UI_CREDITS_PLACEHOLDER_BALANCE): string {
  const normalizedBalance = normalizeCreditsBalance(balance);
  return `Credits: ${normalizedBalance}`;
}