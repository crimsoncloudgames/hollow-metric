-- Production upgrade for credit bucket model.
-- Adds bucket fields, preserves existing balances, and deploys updated credit RPCs.

alter table public.user_credits
  add column if not exists subscription_balance integer not null default 0 check (subscription_balance >= 0);

alter table public.user_credits
  add column if not exists purchased_balance integer not null default 0 check (purchased_balance >= 0);

alter table public.credit_transactions
  add column if not exists transaction_type text;

create unique index if not exists credit_transactions_paddle_transaction_id_idx
  on public.credit_transactions (paddle_transaction_id);

update public.user_credits
set
  purchased_balance = greatest(coalesce(balance, 0), 0),
  subscription_balance = 0,
  balance = greatest(coalesce(balance, 0), 0),
  updated_at = now()
where coalesce(purchased_balance, 0) = 0
  and coalesce(subscription_balance, 0) = 0
  and coalesce(balance, 0) > 0;

create or replace function public.fulfill_paddle_credit_purchase(
  target_user_id uuid,
  paddle_event_id text,
  paddle_transaction_id text,
  price_ids text[],
  credits_to_add integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_rows integer;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if paddle_transaction_id is null or btrim(paddle_transaction_id) = '' then
    raise exception 'paddle_transaction_id is required';
  end if;

  if credits_to_add is null or credits_to_add <= 0 then
    raise exception 'credits_to_add must be greater than zero';
  end if;

  insert into public.credit_transactions (
    user_id,
    paddle_event_id,
    paddle_transaction_id,
    price_ids,
    credits_added,
    transaction_type
  )
  values (
    target_user_id,
    paddle_event_id,
    paddle_transaction_id,
    coalesce(price_ids, array[]::text[]),
    credits_to_add,
    'credit_pack_purchase'
  )
  on conflict (paddle_transaction_id) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows = 0 then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true
    );
  end if;

  insert into public.user_credits (
    user_id,
    balance,
    purchased_balance,
    subscription_balance,
    updated_at
  )
  values (
    target_user_id,
    credits_to_add,
    credits_to_add,
    0,
    now()
  )
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        purchased_balance = public.user_credits.purchased_balance + excluded.purchased_balance,
        updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'duplicate', false
  );
end;
$$;

notify pgrst, 'reload schema';

create or replace function public.fulfill_paddle_subscription_credit_reset(
  target_user_id uuid,
  paddle_event_id text,
  paddle_transaction_id text,
  price_ids text[],
  credits_to_set integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_rows integer;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if paddle_transaction_id is null or btrim(paddle_transaction_id) = '' then
    raise exception 'paddle_transaction_id is required';
  end if;

  if credits_to_set is null or credits_to_set <= 0 then
    raise exception 'credits_to_set must be greater than zero';
  end if;

  insert into public.credit_transactions (
    user_id,
    paddle_event_id,
    paddle_transaction_id,
    price_ids,
    credits_added,
    transaction_type
  )
  values (
    target_user_id,
    paddle_event_id,
    paddle_transaction_id,
    coalesce(price_ids, array[]::text[]),
    credits_to_set,
    'subscription_credit_reset'
  )
  on conflict (paddle_transaction_id) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows = 0 then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true
    );
  end if;

  insert into public.user_credits (
    user_id,
    balance,
    purchased_balance,
    subscription_balance,
    updated_at
  )
  values (
    target_user_id,
    credits_to_set,
    0,
    credits_to_set,
    now()
  )
  on conflict (user_id) do update
    set subscription_balance = excluded.subscription_balance,
        balance = public.user_credits.purchased_balance + excluded.subscription_balance,
        updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'duplicate', false
  );
end;
$$;

notify pgrst, 'reload schema';

create or replace function public.consume_user_credit(credits_to_consume integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  remaining_balance integer;
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if credits_to_consume is null or credits_to_consume <= 0 then
    raise exception 'credits_to_consume must be greater than zero';
  end if;

  update public.user_credits
  set subscription_balance = greatest(subscription_balance - credits_to_consume, 0),
      purchased_balance = greatest(
        purchased_balance - greatest(credits_to_consume - subscription_balance, 0),
        0
      ),
      balance = greatest(subscription_balance - credits_to_consume, 0) + greatest(
        purchased_balance - greatest(credits_to_consume - subscription_balance, 0),
        0
      ),
      updated_at = now()
  where user_id = current_user_id
    and subscription_balance + purchased_balance >= credits_to_consume
  returning balance into remaining_balance;

  if remaining_balance is null then
    return jsonb_build_object(
      'ok', false,
      'remaining_balance', null
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'remaining_balance', remaining_balance
  );
end;
$$;

revoke all on function public.consume_user_credit(integer) from public;
grant execute on function public.consume_user_credit(integer) to authenticated;

notify pgrst, 'reload schema';
