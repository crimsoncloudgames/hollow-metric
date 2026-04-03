-- Paddle subscription ledger for app-level subscription lifecycle syncing.
-- First implementation scope: store current subscription state per Paddle subscription.

create table if not exists public.billing_subscriptions (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,

  -- External Paddle identifiers.
  paddle_subscription_id text not null,
  paddle_customer_id text,

  -- Internal/external plan mapping fields.
  plan_key text,
  paddle_price_id text,

  -- Current lifecycle state from Paddle (e.g. active, trialing, past_due, canceled, paused).
  status text not null check (char_length(trim(status)) > 0),

  -- Current billing period boundaries from Paddle subscription payload.
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,

  -- Populated when subscription is canceled/terminated in Paddle.
  canceled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint billing_subscriptions_paddle_subscription_id_key unique (paddle_subscription_id)
);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions (user_id);

-- Composite index for common app queries (current subscription state per user).
create index if not exists billing_subscriptions_user_id_status_idx
  on public.billing_subscriptions (user_id, status);

-- Note: paddle_subscription_id has a unique constraint above, which also provides an index
-- for fast exact-match lookups by Paddle subscription ID.

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists billing_subscriptions_set_updated_at on public.billing_subscriptions;

create trigger billing_subscriptions_set_updated_at
before update on public.billing_subscriptions
for each row
execute function public.set_updated_at_timestamp();
