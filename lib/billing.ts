export const PAID_SUBSCRIPTIONS_UNAVAILABLE_MESSAGE =
  "Upgrade to Launch Planner to save projects and unlock dashboard features.";

type BillingAccessSnapshot = {
  tier?: string | null;
  premium_access?: boolean | null;
  billing_state?: string | null;
};

export function hasLaunchPlannerAccess(snapshot: BillingAccessSnapshot | null | undefined): boolean {
  const tier = typeof snapshot?.tier === "string" ? snapshot.tier.trim().toLowerCase() : "";
  const billingState =
    typeof snapshot?.billing_state === "string" ? snapshot.billing_state.trim().toLowerCase() : "";

  return tier === "pro" && snapshot?.premium_access === true && (billingState === "active" || billingState === "past_due");
}