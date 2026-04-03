-- RLS hardening prep for production deployment.
-- Apply/adapt these once the backing tables are finalized.

-- 1) Reports: never allow cross-user access.
-- alter table public.reports enable row level security;
-- create policy "reports_select_own" on public.reports for select using (auth.uid() = user_id);
-- create policy "reports_insert_own" on public.reports for insert with check (auth.uid() = user_id);
-- create policy "reports_update_own" on public.reports for update using (auth.uid() = user_id);
-- create policy "reports_delete_own" on public.reports for delete using (auth.uid() = user_id);

-- 2) Billing entitlements/subscriptions (planned): keep server-owned and user-scoped.
-- Keep subscription tier/entitlement rows synced from trusted billing webhooks.
-- Enable RLS once the final table exists and allow users to read only their own row.

-- 3) Financial library projects (planned): must be per-user isolated.
-- alter table public.financial_projects enable row level security;
-- create policy "financial_projects_select_own" on public.financial_projects for select using (auth.uid() = user_id);
-- create policy "financial_projects_insert_own" on public.financial_projects for insert with check (auth.uid() = user_id);
-- create policy "financial_projects_update_own" on public.financial_projects for update using (auth.uid() = user_id);
-- create policy "financial_projects_delete_own" on public.financial_projects for delete using (auth.uid() = user_id);

-- 4) Subscription state (planned): never trust client plan level.
-- Keep subscription tier in a server-owned table synced from billing webhooks.
-- Client may read own tier only; all limits must be enforced server-side.

-- 5) Free preview usage:
-- Keep service-role usage server-only. Do not expose this table to browser clients.
