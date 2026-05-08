-- Safely backfill existing single-balance credit rows into the new bucketed credit model.
-- This preserves the existing displayed balance as purchased credits only.

update public.user_credits
set
  purchased_balance = greatest(coalesce(balance, 0), 0),
  subscription_balance = 0,
  balance = greatest(coalesce(balance, 0), 0)
where coalesce(purchased_balance, 0) = 0
  and coalesce(subscription_balance, 0) = 0
  and coalesce(balance, 0) > 0;
