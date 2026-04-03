-- Remove legacy credits-based Paddle billing schema/data.
-- This is intentionally conservative and limited to credits-only objects.
-- Safe to run multiple times.

begin;

-- Optional pre-checks (uncomment to inspect before dropping):
-- select count(*) as user_credits_rows from public.user_credits;
-- select count(*) as credit_transactions_rows from public.credit_transactions;

drop index if exists public.credit_transactions_user_id_created_at_idx;

drop policy if exists "Users can read own credits" on public.user_credits;

drop table if exists public.credit_transactions;
drop table if exists public.user_credits;

commit;
