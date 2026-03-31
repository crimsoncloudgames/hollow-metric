create table if not exists public.free_preview_usage (
  id bigserial primary key,
  ip_hash text not null unique,
  steam_app_id text not null unique,
  preview_tag text,
  preview_short_desc text,
  preview_status text,
  created_at timestamptz not null default now()
);

alter table public.free_preview_usage
  add column if not exists preview_tag text;

alter table public.free_preview_usage
  add column if not exists preview_short_desc text;

alter table public.free_preview_usage
  add column if not exists preview_status text;

create index if not exists free_preview_usage_created_at_idx
  on public.free_preview_usage (created_at desc);
