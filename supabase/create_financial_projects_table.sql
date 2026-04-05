-- User-scoped saved financial project storage for the launch budget flow.
-- Current product limit is one saved project per user, enforced by the unique user_id constraint.
-- The full normalized Launch Budget payload is stored in project_data as jsonb.

create table if not exists public.financial_projects (
  id bigserial primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  project_name text not null check (char_length(trim(project_name)) > 0),
  project_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_projects_user_id_idx
  on public.financial_projects (user_id);

grant select, insert, update, delete on table public.financial_projects to authenticated;
grant usage, select on sequence public.financial_projects_id_seq to authenticated;

alter table public.financial_projects enable row level security;

drop policy if exists "Users can read own financial projects" on public.financial_projects;
create policy "Users can read own financial projects"
  on public.financial_projects
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own financial projects" on public.financial_projects;
create policy "Users can insert own financial projects"
  on public.financial_projects
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own financial projects" on public.financial_projects;
create policy "Users can update own financial projects"
  on public.financial_projects
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own financial projects" on public.financial_projects;
create policy "Users can delete own financial projects"
  on public.financial_projects
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_financial_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists financial_projects_set_updated_at on public.financial_projects;

create trigger financial_projects_set_updated_at
before update on public.financial_projects
for each row
execute function public.set_financial_projects_updated_at();

notify pgrst, 'reload schema';