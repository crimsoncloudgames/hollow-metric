grant select, insert, update, delete on table public.reports to authenticated;

alter table public.reports enable row level security;

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own reports" on public.reports;
create policy "Users can insert own reports"
  on public.reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reports" on public.reports;
create policy "Users can update own reports"
  on public.reports
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reports" on public.reports;
create policy "Users can delete own reports"
  on public.reports
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on table public.billing_subscriptions to authenticated;

alter table public.billing_subscriptions enable row level security;

drop policy if exists "Users can read own billing subscriptions" on public.billing_subscriptions;
create policy "Users can read own billing subscriptions"
  on public.billing_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';