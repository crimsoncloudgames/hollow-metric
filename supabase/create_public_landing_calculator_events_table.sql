-- Landing page public calculator completion tracking.
create table if not exists public.landing_calculator_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  source text not null default 'landing_page',
  total_cost_range text,
  game_price numeric,
  refund_rate numeric,
  withholding_rate numeric,
  publisher_split numeric,
  break_even_copies_range text,
  created_at timestamptz not null default now()
);

alter table public.landing_calculator_events enable row level security;
