create table if not exists public.feature_request_locks (
  feature_key text not null check (char_length(btrim(feature_key)) > 0),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (feature_key, user_id)
);

alter table public.feature_request_locks enable row level security;

create or replace function public.acquire_feature_request_lock(
  feature_name text,
  stale_after_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_rows integer := 0;
  normalized_feature_name text := btrim(feature_name);
  effective_stale_after integer := greatest(coalesce(stale_after_seconds, 900), 60);
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if normalized_feature_name = '' then
    raise exception 'feature_name is required';
  end if;

  delete from public.feature_request_locks
  where feature_key = normalized_feature_name
    and user_id = current_user_id
    and request_started_at <= now() - make_interval(secs => effective_stale_after);

  insert into public.feature_request_locks (
    feature_key,
    user_id,
    request_started_at
  )
  values (
    normalized_feature_name,
    current_user_id,
    now()
  )
  on conflict (feature_key, user_id) do nothing;

  get diagnostics inserted_rows = row_count;

  return inserted_rows > 0;
end;
$$;

create or replace function public.release_feature_request_lock(feature_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_rows integer := 0;
  normalized_feature_name text := btrim(feature_name);
begin
  if current_user_id is null then
    raise exception 'authenticated user required';
  end if;

  if normalized_feature_name = '' then
    raise exception 'feature_name is required';
  end if;

  delete from public.feature_request_locks
  where feature_key = normalized_feature_name
    and user_id = current_user_id;

  get diagnostics deleted_rows = row_count;

  return deleted_rows > 0;
end;
$$;

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
  set balance = balance - credits_to_consume,
      updated_at = now()
  where user_id = current_user_id
    and balance >= credits_to_consume
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

revoke all on function public.acquire_feature_request_lock(text, integer) from public;
revoke all on function public.release_feature_request_lock(text) from public;
revoke all on function public.consume_user_credit(integer) from public;

grant execute on function public.acquire_feature_request_lock(text, integer) to authenticated;
grant execute on function public.release_feature_request_lock(text) to authenticated;
grant execute on function public.consume_user_credit(integer) to authenticated;

notify pgrst, 'reload schema';