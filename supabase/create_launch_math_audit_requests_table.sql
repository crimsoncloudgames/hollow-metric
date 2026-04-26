create table if not exists public.launch_math_audit_requests (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(trim(name)) > 0),
  email text not null check (char_length(trim(email)) > 0),
  game_name text not null check (char_length(trim(game_name)) > 0),
  steam_url text not null check (char_length(trim(steam_url)) > 0),
  release_window text,
  planned_price text,
  estimated_budget text not null check (char_length(trim(estimated_budget)) > 0),
  biggest_concern text not null check (char_length(trim(biggest_concern)) > 0),
  referral_code text,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid')),
  paddle_transaction_id text,
  paid_at timestamptz,
  owner_notification_sent_at timestamptz
);

create index if not exists launch_math_audit_requests_status_created_at_idx
  on public.launch_math_audit_requests (status, created_at desc);

create unique index if not exists launch_math_audit_requests_paddle_transaction_id_key
  on public.launch_math_audit_requests (paddle_transaction_id)
  where paddle_transaction_id is not null;

notify pgrst, 'reload schema';
