create table if not exists public.free_preview_usage (
  id bigserial primary key,
  ip_hash text not null unique,
  steam_app_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists free_preview_usage_created_at_idx
  on public.free_preview_usage (created_at desc);
