create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  paddle_event_id text unique,
  paddle_transaction_id text not null unique,
  price_ids text[] not null default '{}',
  credits_added integer not null check (credits_added > 0),
  created_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;

drop policy if exists "Users can read own credits" on public.user_credits;
create policy "Users can read own credits"
  on public.user_credits
  for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists credit_transactions_user_id_created_at_idx
  on public.credit_transactions (user_id, created_at desc);
