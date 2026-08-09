-- Make plan credits authoritative, atomic, and extensible with one-time credit packs.
-- A credit is consumed when an AI/production request begins. Failed generations
-- intentionally remain charged because provider work has already been requested.

alter table public.subscription_plans
  add column if not exists credit_limits jsonb not null default '{}'::jsonb;

update public.subscription_plans
set credit_limits = case key
  when 'free' then '{"review":1,"cover":1,"format":1,"submission":0,"story":3}'::jsonb
  when 'starter' then '{"review":3,"cover":3,"format":3,"submission":1,"story":10}'::jsonb
  when 'author' then '{"review":7,"cover":7,"format":7,"submission":3,"story":25}'::jsonb
  when 'pro' then '{"review":15,"cover":15,"format":15,"submission":8,"story":60}'::jsonb
  when 'publisher' then '{"review":40,"cover":40,"format":40,"submission":20,"story":120}'::jsonb
  else '{}'::jsonb
end;

create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  remaining integer not null check (remaining >= 0 and remaining <= amount),
  source text not null default 'purchase' check (source in ('purchase', 'support', 'promotion')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists credit_grants_user_available_idx
  on public.credit_grants (user_id, created_at)
  where remaining > 0 and revoked_at is null;

alter table public.credit_grants enable row level security;

drop policy if exists "Authors can read their credit grants" on public.credit_grants;
create policy "Authors can read their credit grants" on public.credit_grants
for select to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

grant select on public.credit_grants to authenticated;
grant all on public.credit_grants to service_role;

alter table public.credit_usage
  add column if not exists source text not null default 'included'
    check (source in ('included', 'purchased')),
  add column if not exists grant_id uuid references public.credit_grants(id) on delete set null;

-- Usage can only be recorded through the atomic function below. This prevents a
-- browser client from fabricating, skipping, or racing its own credit entries.
drop policy if exists "Authors can record their credit usage" on public.credit_usage;
revoke insert on public.credit_usage from authenticated;

create or replace function public.consume_credit(
  p_type text,
  p_related_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan text;
  v_limit integer := 0;
  v_used integer := 0;
  v_included_remaining integer := 0;
  v_extra_remaining integer := 0;
  v_grant_id uuid;
  v_usage_id uuid;
  v_source text;
  v_period_start timestamptz := date_trunc('month', now());
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED', 'error', 'Not authenticated.');
  end if;

  if p_type not in ('review', 'cover', 'format', 'submission', 'story') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CREDIT_TYPE', 'error', 'Invalid credit type.');
  end if;

  -- Serialize spending for this user, category, and billing window.
  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || p_type || ':' || v_period_start::text, 0)
  );

  select coalesce(p.subscription_tier, 'free')
    into v_plan
  from public.profiles p
  where p.id = v_user_id;

  if v_plan is null then
    return jsonb_build_object('ok', false, 'code', 'PLAN_NOT_FOUND', 'error', 'Could not load your account plan.');
  end if;

  select coalesce((sp.credit_limits ->> p_type)::integer, 0)
    into v_limit
  from public.subscription_plans sp
  where sp.key = v_plan;

  if v_limit is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'PLAN_NOT_CONFIGURED',
      'error', 'Your plan credit settings are unavailable. Please contact 36Seas support.'
    );
  end if;

  select coalesce(sum(cu.amount), 0)::integer
    into v_used
  from public.credit_usage cu
  where cu.user_id = v_user_id
    and cu.type = p_type
    and cu.source = 'included'
    and cu.created_at >= v_period_start;

  select coalesce(sum(cg.remaining), 0)::integer
    into v_extra_remaining
  from public.credit_grants cg
  where cg.user_id = v_user_id
    and cg.remaining > 0
    and cg.revoked_at is null
    and (cg.expires_at is null or cg.expires_at > now());

  if v_used < v_limit then
    v_source := 'included';
    v_included_remaining := greatest(v_limit - v_used - 1, 0);
  else
    select cg.id
      into v_grant_id
    from public.credit_grants cg
    where cg.user_id = v_user_id
      and cg.remaining > 0
      and cg.revoked_at is null
      and (cg.expires_at is null or cg.expires_at > now())
    order by cg.expires_at asc nulls last, cg.created_at asc
    for update skip locked
    limit 1;

    if v_grant_id is null then
      return jsonb_build_object(
        'ok', false,
        'code', 'CREDITS_EXHAUSTED',
        'plan', v_plan,
        'type', p_type,
        'limit', v_limit,
        'includedRemaining', 0,
        'extraRemaining', 0,
        'remaining', 0,
        'error', format(
          'You have used all %s %s credits included in your %s plan this month. Upgrade your plan or add extra credits to continue.',
          v_limit, p_type, initcap(v_plan)
        )
      );
    end if;

    update public.credit_grants
    set remaining = remaining - 1
    where id = v_grant_id;

    v_source := 'purchased';
    v_included_remaining := 0;
    v_extra_remaining := greatest(v_extra_remaining - 1, 0);
  end if;

  insert into public.credit_usage (user_id, type, amount, related_id, source, grant_id)
  values (v_user_id, p_type, 1, p_related_id, v_source, v_grant_id)
  returning id into v_usage_id;

  return jsonb_build_object(
    'ok', true,
    'usageId', v_usage_id,
    'plan', v_plan,
    'type', p_type,
    'source', v_source,
    'limit', v_limit,
    'includedRemaining', v_included_remaining,
    'extraRemaining', v_extra_remaining,
    'remaining', v_included_remaining + v_extra_remaining
  );
end;
$$;

revoke all on function public.consume_credit(text, uuid) from public;
revoke all on function public.consume_credit(text, uuid) from anon;
grant execute on function public.consume_credit(text, uuid) to authenticated;
