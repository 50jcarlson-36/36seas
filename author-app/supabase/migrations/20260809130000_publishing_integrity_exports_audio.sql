-- Publication integrity, multi-format exports, legal acceptance, and premium audio.
-- Every generated artifact is private and every paid operation uses the atomic ledger.

alter table public.formatting_jobs drop constraint if exists formatting_jobs_format_type_check;
alter table public.formatting_jobs
  add constraint formatting_jobs_format_type_check
  check (format_type in ('epub', 'pdf_print', 'docx'));

alter table public.credit_usage drop constraint if exists credit_usage_type_check;
alter table public.credit_usage
  add constraint credit_usage_type_check
  check (type in ('review', 'cover', 'format', 'submission', 'story', 'originality', 'audio'));

update public.subscription_plans
set credit_limits = credit_limits || case key
  when 'free' then '{"originality":1,"audio":0}'::jsonb
  when 'starter' then '{"originality":3,"audio":0}'::jsonb
  when 'author' then '{"originality":7,"audio":0}'::jsonb
  when 'pro' then '{"originality":15,"audio":0}'::jsonb
  when 'publisher' then '{"originality":40,"audio":0}'::jsonb
  else '{"originality":0,"audio":0}'::jsonb
end;

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('terms_and_originality')),
  document_version text not null,
  clause_hash text not null,
  accepted_at timestamptz not null default now(),
  acceptance_source text not null default 'signup' check (acceptance_source in ('signup', 'publish_gate')),
  unique (user_id, document_type, document_version)
);

create table public.originality_checks (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_index integer not null check (chapter_index >= 0),
  chapter_title text not null,
  content_hash text not null,
  provider text not null default 'copyleaks',
  status text not null default 'running' check (status in ('running', 'passed', 'flagged', 'failed')),
  similarity_percent numeric(5,2) check (similarity_percent is null or similarity_percent between 0 and 100),
  matches jsonb not null default '[]'::jsonb,
  acknowledged_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index originality_checks_manuscript_chapter_idx
  on public.originality_checks (manuscript_id, chapter_index, created_at desc);
create index originality_checks_user_id_idx on public.originality_checks (user_id);

create table public.audiobook_jobs (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'typecast',
  voice_id text not null,
  voice_name text not null,
  narration_style text,
  word_count integer not null check (word_count >= 0),
  character_count integer not null check (character_count >= 0),
  credits_charged integer not null check (credits_charged > 0),
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  audio_manifest jsonb not null default '[]'::jsonb,
  package_path text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audiobook_jobs_manuscript_created_idx
  on public.audiobook_jobs (manuscript_id, created_at desc);
create index audiobook_jobs_user_id_idx on public.audiobook_jobs (user_id);

create trigger originality_checks_touch_updated_at before update on public.originality_checks
for each row execute function private.touch_updated_at();
create trigger audiobook_jobs_touch_updated_at before update on public.audiobook_jobs
for each row execute function private.touch_updated_at();

alter table public.legal_acceptances enable row level security;
alter table public.originality_checks enable row level security;
alter table public.audiobook_jobs enable row level security;

create policy "Authors can read their legal acceptances" on public.legal_acceptances
for select to authenticated using (user_id = (select auth.uid()) or (select private.current_user_is_admin()));
create policy "Authors can record their legal acceptance" on public.legal_acceptances
for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Originality checks follow manuscript access" on public.originality_checks
for select to authenticated using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()));
create policy "Audiobook jobs follow manuscript access" on public.audiobook_jobs
for select to authenticated using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()));

grant select, insert on public.legal_acceptances to authenticated;
grant select on public.originality_checks to authenticated;
grant select on public.audiobook_jobs to authenticated;
grant all on public.legal_acceptances, public.originality_checks, public.audiobook_jobs to service_role;

-- Capture explicit signup acceptance from immutable auth metadata.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  if coalesce((new.raw_user_meta_data ->> 'accepted_originality_terms')::boolean, false) then
    insert into public.legal_acceptances (
      user_id, document_type, document_version, clause_hash, accepted_at, acceptance_source
    ) values (
      new.id,
      'terms_and_originality',
      coalesce(nullif(new.raw_user_meta_data ->> 'terms_version', ''), '2026-08-09'),
      coalesce(nullif(new.raw_user_meta_data ->> 'terms_clause_hash', ''), '36seas-originality-v1'),
      coalesce((new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz, now()),
      'signup'
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Multi-unit charging is required for character-scaled audiobook jobs.
create or replace function public.consume_credits(
  p_type text,
  p_amount integer,
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
  v_included_to_use integer := 0;
  v_needed_purchased integer := 0;
  v_available_purchased integer := 0;
  v_period_start timestamptz := date_trunc('month', now());
  v_grant record;
  v_take integer;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED', 'error', 'Not authenticated.');
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT', 'error', 'Invalid credit amount.');
  end if;
  if p_type not in ('review', 'cover', 'format', 'submission', 'story', 'originality', 'audio') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CREDIT_TYPE', 'error', 'Invalid credit type.');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_type || ':' || v_period_start::text, 0));
  select coalesce(p.subscription_tier, 'free') into v_plan from public.profiles p where p.id = v_user_id;
  select coalesce((sp.credit_limits ->> p_type)::integer, 0) into v_limit
    from public.subscription_plans sp where sp.key = v_plan;
  select coalesce(sum(cu.amount), 0)::integer into v_used from public.credit_usage cu
    where cu.user_id = v_user_id and cu.type = p_type and cu.source = 'included' and cu.created_at >= v_period_start;

  v_included_to_use := least(greatest(v_limit - v_used, 0), p_amount);
  v_needed_purchased := p_amount - v_included_to_use;
  select coalesce(sum(cg.remaining), 0)::integer into v_available_purchased from public.credit_grants cg
    where cg.user_id = v_user_id and cg.remaining > 0 and cg.revoked_at is null
      and (cg.expires_at is null or cg.expires_at > now());

  if v_available_purchased < v_needed_purchased then
    return jsonb_build_object(
      'ok', false, 'code', 'CREDITS_EXHAUSTED', 'plan', v_plan, 'type', p_type,
      'required', p_amount, 'remaining', greatest(v_limit - v_used, 0) + v_available_purchased,
      'error', format('This request needs %s credits. Upgrade your plan or add extra credits to continue.', p_amount)
    );
  end if;

  if v_included_to_use > 0 then
    insert into public.credit_usage (user_id, type, amount, related_id, source)
    values (v_user_id, p_type, v_included_to_use, p_related_id, 'included');
  end if;

  if v_needed_purchased > 0 then
    for v_grant in
      select cg.id, cg.remaining from public.credit_grants cg
      where cg.user_id = v_user_id and cg.remaining > 0 and cg.revoked_at is null
        and (cg.expires_at is null or cg.expires_at > now())
      order by cg.expires_at asc nulls last, cg.created_at asc for update
    loop
      exit when v_needed_purchased = 0;
      v_take := least(v_grant.remaining, v_needed_purchased);
      update public.credit_grants set remaining = remaining - v_take where id = v_grant.id;
      insert into public.credit_usage (user_id, type, amount, related_id, source, grant_id)
      values (v_user_id, p_type, v_take, p_related_id, 'purchased', v_grant.id);
      v_needed_purchased := v_needed_purchased - v_take;
    end loop;
  end if;

  return jsonb_build_object(
    'ok', true, 'plan', v_plan, 'type', p_type, 'charged', p_amount,
    'remaining', greatest(v_limit - v_used - v_included_to_use, 0) + v_available_purchased - (p_amount - v_included_to_use)
  );
end;
$$;

create or replace function public.consume_credit(p_type text, p_related_id uuid default null)
returns jsonb language sql security definer set search_path = ''
as $$ select public.consume_credits(p_type, 1, p_related_id); $$;

revoke all on function public.consume_credits(text, integer, uuid) from public, anon;
grant execute on function public.consume_credits(text, integer, uuid) to authenticated;
revoke all on function public.consume_credit(text, uuid) from public, anon;
grant execute on function public.consume_credit(text, uuid) to authenticated;

update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'application/epub+zip', 'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'audio/wav', 'application/json'
]
where id = 'exports';
