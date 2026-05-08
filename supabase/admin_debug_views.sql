-- Admin-only debug views for user credit and billing state.
-- These views join to auth.users to expose email and display name for admin debugging only.

create or replace view public.admin_user_credits_view as
select
  uc.user_id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ) as display_name,
  uc.balance,
  uc.subscription_balance,
  uc.purchased_balance,
  uc.updated_at
from public.user_credits uc
join auth.users u on u.id = uc.user_id;

create or replace view public.admin_user_entitlements_view as
select
  ue.user_id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ) as display_name,
  ue.tier,
  ue.premium_access,
  ue.billing_state,
  ue.active_subscription_id,
  ue.source,
  ue.effective_from
from public.user_entitlements ue
join auth.users u on u.id = ue.user_id;

create or replace view public.admin_credit_transactions_view as
select
  ct.user_id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ) as display_name,
  ct.paddle_event_id,
  ct.paddle_transaction_id,
  ct.price_ids,
  ct.credits_added,
  ct.transaction_type,
  ct.created_at
from public.credit_transactions ct
join auth.users u on u.id = ct.user_id;

revoke all on public.admin_user_credits_view from public;
revoke all on public.admin_user_credits_view from authenticated;

revoke all on public.admin_user_entitlements_view from public;
revoke all on public.admin_user_entitlements_view from authenticated;

revoke all on public.admin_credit_transactions_view from public;
revoke all on public.admin_credit_transactions_view from authenticated;
