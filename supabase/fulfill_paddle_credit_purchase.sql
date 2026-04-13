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
    credits_added
  )
  values (
    target_user_id,
    paddle_event_id,
    paddle_transaction_id,
    coalesce(price_ids, array[]::text[]),
    credits_to_add
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
    updated_at
  )
  values (
    target_user_id,
    credits_to_add,
    now()
  )
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'duplicate', false
  );
end;
$$;

notify pgrst, 'reload schema';