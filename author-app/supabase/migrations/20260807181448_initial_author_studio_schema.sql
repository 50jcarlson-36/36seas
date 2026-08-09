-- 36Seas Author Studio baseline schema.
-- This migration is intentionally self-contained so a clean Supabase project can
-- be provisioned before the later Stripe, services, and membership migrations.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.subscription_plans (
  key text primary key,
  name text not null,
  price_monthly numeric(10, 2) not null check (price_monthly >= 0),
  features jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  pen_name text,
  role text not null default 'member' check (role in ('member', 'worker', 'manager', 'admin')),
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'starter', 'author', 'pro', 'publisher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_member_identity check (user_id is not null or invited_email is not null)
);

create unique index workspace_members_user_unique
  on public.workspace_members (workspace_id, user_id)
  where user_id is not null;
create unique index workspace_members_invite_unique
  on public.workspace_members (workspace_id, lower(invited_email))
  where invited_email is not null and status <> 'removed';

create table public.manuscripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  title text not null,
  subtitle text,
  genre text,
  synopsis text,
  word_count integer check (word_count is null or word_count >= 0),
  file_path text not null,
  file_type text,
  status text not null default 'uploaded',
  page_count_interior integer check (page_count_interior is null or page_count_interior > 0),
  copyright_holder text,
  pub_year integer check (pub_year is null or pub_year between 1000 and 9999),
  isbn_paperback text,
  isbn_hardcover text,
  isbn_ebook text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  model text,
  overall_score numeric(5, 2),
  summary text,
  developmental_notes jsonb not null default '[]'::jsonb,
  line_edits jsonb not null default '[]'::jsonb,
  readability jsonb not null default '{}'::jsonb,
  error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.covers (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null default '',
  style text,
  variant text not null default 'front'
    check (variant in ('front', 'paperback_wrap', 'hardcover_wrap')),
  spec jsonb,
  image_path text,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.formatting_jobs (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format_type text not null check (format_type in ('epub', 'pdf_print')),
  trim_size text not null default '6x9',
  file_path text,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.submission_packages (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  ai_content_disclosure boolean not null default false,
  package_path text,
  status text not null default 'packaged',
  review_status text not null default 'not_submitted',
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null references public.subscription_plans(key),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'incomplete',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('review', 'cover', 'format', 'submission', 'story')),
  amount integer not null default 1 check (amount > 0),
  related_id uuid,
  created_at timestamptz not null default now()
);

create table public.isbn_pool (
  id uuid primary key default gen_random_uuid(),
  isbn13 text not null unique check (isbn13 ~ '^[0-9]{13}$'),
  format text not null check (format in ('paperback', 'hardcover', 'ebook')),
  status text not null default 'available' check (status in ('available', 'assigned')),
  assigned_manuscript_id uuid references public.manuscripts(id) on delete set null,
  assigned_at timestamptz,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.story_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  title text not null,
  genre text,
  premise text,
  main_character jsonb not null default '{}'::jsonb,
  setting text,
  outline jsonb not null default '[]'::jsonb,
  characters jsonb not null default '[]'::jsonb,
  status text not null default 'drafting',
  compiled_manuscript_id uuid references public.manuscripts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.story_chapters (
  id uuid primary key default gen_random_uuid(),
  story_project_id uuid not null references public.story_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null,
  summary text,
  content text,
  status text not null default 'pending',
  word_count integer check (word_count is null or word_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_project_id, chapter_number)
);

create index profiles_subscription_tier_idx on public.profiles (subscription_tier);
create index workspaces_owner_id_idx on public.workspaces (owner_id);
create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);
create index workspace_members_invited_email_idx on public.workspace_members (lower(invited_email));
create index manuscripts_user_created_idx on public.manuscripts (user_id, created_at desc);
create index manuscripts_workspace_id_idx on public.manuscripts (workspace_id);
create index ai_reviews_manuscript_created_idx on public.ai_reviews (manuscript_id, created_at desc);
create index ai_reviews_user_id_idx on public.ai_reviews (user_id);
create index covers_manuscript_created_idx on public.covers (manuscript_id, created_at desc);
create index covers_user_id_idx on public.covers (user_id);
create index formatting_jobs_manuscript_created_idx on public.formatting_jobs (manuscript_id, created_at desc);
create index formatting_jobs_user_id_idx on public.formatting_jobs (user_id);
create index submission_packages_manuscript_created_idx on public.submission_packages (manuscript_id, created_at desc);
create index submission_packages_user_id_idx on public.submission_packages (user_id);
create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index credit_usage_user_type_created_idx on public.credit_usage (user_id, type, created_at desc);
create index isbn_pool_format_status_created_idx on public.isbn_pool (format, status, created_at);
create index story_projects_user_created_idx on public.story_projects (user_id, created_at desc);
create index story_projects_workspace_id_idx on public.story_projects (workspace_id);
create index story_chapters_project_number_idx on public.story_chapters (story_project_id, chapter_number);
create index story_chapters_user_id_idx on public.story_chapters (user_id);

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    );
$$;

create or replace function private.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.workspaces
      where id = target_workspace_id and owner_id = (select auth.uid())
    );
$$;

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.workspace_members
      where workspace_id = target_workspace_id
        and user_id = (select auth.uid())
        and status = 'active'
    );
$$;

create or replace function private.can_access_manuscript(target_manuscript_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.manuscripts m
      where m.id = target_manuscript_id
        and (
          m.user_id = (select auth.uid())
          or (m.workspace_id is not null and private.is_workspace_member(m.workspace_id))
        )
    );
$$;

create or replace function private.can_access_story(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.story_projects s
      where s.id = target_story_id
        and (
          s.user_id = (select auth.uid())
          or (s.workspace_id is not null and private.is_workspace_member(s.workspace_id))
        )
    );
$$;

create or replace function private.can_access_storage_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  manuscript_segment text := split_part(object_name, '/', 2);
begin
  if (select auth.uid()) is null then
    return false;
  end if;
  if split_part(object_name, '/', 1) = (select auth.uid())::text then
    return true;
  end if;
  if manuscript_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return private.can_access_manuscript(manuscript_segment::uuid);
  end if;
  return false;
end;
$$;

revoke all on function private.current_user_is_admin() from public;
revoke all on function private.is_workspace_owner(uuid) from public;
revoke all on function private.is_workspace_member(uuid) from public;
revoke all on function private.can_access_manuscript(uuid) from public;
revoke all on function private.can_access_story(uuid) from public;
revoke all on function private.can_access_storage_object(text) from public;
grant execute on function private.current_user_is_admin() to authenticated, service_role;
grant execute on function private.is_workspace_owner(uuid) to authenticated, service_role;
grant execute on function private.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function private.can_access_manuscript(uuid) to authenticated, service_role;
grant execute on function private.can_access_story(uuid) to authenticated, service_role;
grant execute on function private.can_access_storage_object(text) to authenticated, service_role;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant execute on function private.touch_updated_at() to authenticated, service_role;

create trigger subscription_plans_touch_updated_at before update on public.subscription_plans
for each row execute function private.touch_updated_at();
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger workspaces_touch_updated_at before update on public.workspaces
for each row execute function private.touch_updated_at();
create trigger workspace_members_touch_updated_at before update on public.workspace_members
for each row execute function private.touch_updated_at();
create trigger manuscripts_touch_updated_at before update on public.manuscripts
for each row execute function private.touch_updated_at();
create trigger ai_reviews_touch_updated_at before update on public.ai_reviews
for each row execute function private.touch_updated_at();
create trigger covers_touch_updated_at before update on public.covers
for each row execute function private.touch_updated_at();
create trigger formatting_jobs_touch_updated_at before update on public.formatting_jobs
for each row execute function private.touch_updated_at();
create trigger submission_packages_touch_updated_at before update on public.submission_packages
for each row execute function private.touch_updated_at();
create trigger subscriptions_touch_updated_at before update on public.subscriptions
for each row execute function private.touch_updated_at();
create trigger story_projects_touch_updated_at before update on public.story_projects
for each row execute function private.touch_updated_at();
create trigger story_chapters_touch_updated_at before update on public.story_chapters
for each row execute function private.touch_updated_at();

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
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
grant execute on function private.handle_new_user() to supabase_auth_admin, service_role;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.subscription_plans enable row level security;
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.manuscripts enable row level security;
alter table public.ai_reviews enable row level security;
alter table public.covers enable row level security;
alter table public.formatting_jobs enable row level security;
alter table public.submission_packages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_usage enable row level security;
alter table public.isbn_pool enable row level security;
alter table public.story_projects enable row level security;
alter table public.story_chapters enable row level security;

create policy "Plans are publicly readable" on public.subscription_plans
for select to anon, authenticated using (true);

create policy "Profiles are readable by owner or admin" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or (select private.current_user_is_admin()));
create policy "Profiles are editable by owner" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Workspaces are readable by members" on public.workspaces
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_workspace_member(id))
  or (select private.current_user_is_admin())
);
create policy "Authors can create their own workspaces" on public.workspaces
for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners can update workspaces" on public.workspaces
for update to authenticated
using (owner_id = (select auth.uid()) or (select private.current_user_is_admin()))
with check (owner_id = (select auth.uid()) or (select private.current_user_is_admin()));
create policy "Owners can delete workspaces" on public.workspaces
for delete to authenticated
using (owner_id = (select auth.uid()) or (select private.current_user_is_admin()));

create policy "Workspace memberships are visible to participants" on public.workspace_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or lower(invited_email) = lower((select auth.jwt() ->> 'email'))
  or (select private.is_workspace_owner(workspace_id))
  or (select private.current_user_is_admin())
);
create policy "Workspace owners can invite members" on public.workspace_members
for insert to authenticated
with check ((select private.is_workspace_owner(workspace_id)) or (select private.current_user_is_admin()));
create policy "Invitees and owners can update memberships" on public.workspace_members
for update to authenticated
using (
  (user_id is null and lower(invited_email) = lower((select auth.jwt() ->> 'email')))
  or (select private.is_workspace_owner(workspace_id))
  or (select private.current_user_is_admin())
)
with check (
  (
    user_id = (select auth.uid())
    and lower(invited_email) = lower((select auth.jwt() ->> 'email'))
    and role in ('editor', 'viewer')
    and status = 'active'
  )
  or (select private.is_workspace_owner(workspace_id))
  or (select private.current_user_is_admin())
);
create policy "Workspace owners can remove members" on public.workspace_members
for delete to authenticated
using ((select private.is_workspace_owner(workspace_id)) or (select private.current_user_is_admin()));

create policy "Manuscripts are visible to owners and teams" on public.manuscripts
for select to authenticated
using (
  user_id = (select auth.uid())
  or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  or (select private.current_user_is_admin())
);
create policy "Authors can create manuscripts" on public.manuscripts
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (workspace_id is null or (select private.is_workspace_member(workspace_id)))
);
create policy "Owners and teams can update manuscripts" on public.manuscripts
for update to authenticated
using (
  user_id = (select auth.uid())
  or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  or (select private.current_user_is_admin())
)
with check (
  user_id = (select auth.uid())
  or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  or (select private.current_user_is_admin())
);
create policy "Owners can delete manuscripts" on public.manuscripts
for delete to authenticated
using (user_id = (select auth.uid()) or (select private.current_user_is_admin()));

create policy "Reviews follow manuscript access" on public.ai_reviews
for select to authenticated
using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()));
create policy "Authors can create reviews" on public.ai_reviews
for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.can_access_manuscript(manuscript_id)));
create policy "Authors can update their reviews" on public.ai_reviews
for update to authenticated
using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()))
with check (
  (user_id = (select auth.uid()) and (select private.can_access_manuscript(manuscript_id)))
  or (select private.current_user_is_admin())
);

create policy "Covers follow manuscript access" on public.covers
for select to authenticated
using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()));
create policy "Authors can create covers" on public.covers
for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.can_access_manuscript(manuscript_id)));
create policy "Authors can update their covers" on public.covers
for update to authenticated
using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()))
with check (
  (user_id = (select auth.uid()) and (select private.can_access_manuscript(manuscript_id)))
  or (select private.current_user_is_admin())
);

create policy "Formatting jobs follow manuscript access" on public.formatting_jobs
for select to authenticated
using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()));
create policy "Authors can create formatting jobs" on public.formatting_jobs
for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.can_access_manuscript(manuscript_id)));
create policy "Authors can update their formatting jobs" on public.formatting_jobs
for update to authenticated
using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()))
with check (
  (user_id = (select auth.uid()) and (select private.can_access_manuscript(manuscript_id)))
  or (select private.current_user_is_admin())
);

create policy "Submission packages follow manuscript access" on public.submission_packages
for select to authenticated
using ((select private.can_access_manuscript(manuscript_id)) or (select private.current_user_is_admin()));
create policy "Authors can create submission packages" on public.submission_packages
for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.can_access_manuscript(manuscript_id)));
create policy "Authors can read their subscriptions" on public.subscriptions
for select to authenticated using (user_id = (select auth.uid()));

create policy "Authors can read their credit usage" on public.credit_usage
for select to authenticated using (user_id = (select auth.uid()));
create policy "Authors can record their credit usage" on public.credit_usage
for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Authenticated authors can view the ISBN pool" on public.isbn_pool
for select to authenticated using (true);
create policy "Admins can add ISBNs" on public.isbn_pool
for insert to authenticated with check ((select private.current_user_is_admin()));
create policy "Authors can atomically claim available ISBNs" on public.isbn_pool
for update to authenticated
using (status = 'available' or (select private.current_user_is_admin()))
with check (
  (status = 'assigned' and assigned_manuscript_id is not null
    and (select private.can_access_manuscript(assigned_manuscript_id)))
  or (select private.current_user_is_admin())
);

create policy "Stories are visible to owners and teams" on public.story_projects
for select to authenticated
using (
  user_id = (select auth.uid())
  or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  or (select private.current_user_is_admin())
);
create policy "Authors can create stories" on public.story_projects
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (workspace_id is null or (select private.is_workspace_member(workspace_id)))
);
create policy "Authors can update accessible stories" on public.story_projects
for update to authenticated
using (
  user_id = (select auth.uid())
  or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  or (select private.current_user_is_admin())
)
with check (
  user_id = (select auth.uid())
  or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  or (select private.current_user_is_admin())
);
create policy "Owners can delete stories" on public.story_projects
for delete to authenticated using (user_id = (select auth.uid()) or (select private.current_user_is_admin()));

create policy "Chapters follow story access" on public.story_chapters
for select to authenticated
using ((select private.can_access_story(story_project_id)) or (select private.current_user_is_admin()));
create policy "Authors can create chapters" on public.story_chapters
for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.can_access_story(story_project_id)));
create policy "Authors can update chapters" on public.story_chapters
for update to authenticated
using ((select private.can_access_story(story_project_id)) or (select private.current_user_is_admin()))
with check (
  (user_id = (select auth.uid()) and (select private.can_access_story(story_project_id)))
  or (select private.current_user_is_admin())
);

-- Supabase grants broad API privileges on public tables by default. Reset them
-- before adding the narrow table- and column-level permissions used by the app.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.subscription_plans to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, pen_name) on public.profiles to authenticated;
grant select, insert, delete on public.workspaces to authenticated;
grant update (name) on public.workspaces to authenticated;
grant select, insert, delete on public.workspace_members to authenticated;
grant update (user_id, status) on public.workspace_members to authenticated;
grant select, insert, delete on public.manuscripts to authenticated;
grant update (
  title, subtitle, genre, synopsis, word_count, file_path, file_type, status,
  page_count_interior, copyright_holder, pub_year, isbn_paperback, isbn_hardcover, isbn_ebook
) on public.manuscripts to authenticated;
grant select on public.ai_reviews to authenticated;
grant insert (manuscript_id, user_id, status) on public.ai_reviews to authenticated;
grant update (
  status, model, overall_score, summary, developmental_notes, line_edits,
  readability, error, completed_at
) on public.ai_reviews to authenticated;
grant select on public.covers to authenticated;
grant insert (manuscript_id, user_id, prompt, style, variant, spec, image_path, status) on public.covers to authenticated;
grant update (prompt, style, variant, spec, image_path, status, error) on public.covers to authenticated;
grant select on public.formatting_jobs to authenticated;
grant insert (manuscript_id, user_id, format_type, trim_size, status) on public.formatting_jobs to authenticated;
grant update (format_type, trim_size, file_path, status, error) on public.formatting_jobs to authenticated;
grant select on public.submission_packages to authenticated;
grant insert (
  manuscript_id, user_id, metadata, ai_content_disclosure, package_path, status
) on public.submission_packages to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert on public.credit_usage to authenticated;
grant select, insert on public.isbn_pool to authenticated;
grant update (status, assigned_manuscript_id, assigned_at) on public.isbn_pool to authenticated;
grant select, delete on public.story_projects to authenticated;
grant insert (
  user_id, workspace_id, title, genre, premise, main_character, setting, outline, characters, status
) on public.story_projects to authenticated;
grant update (
  title, genre, premise, main_character, setting, outline, characters, status, compiled_manuscript_id
) on public.story_projects to authenticated;
grant select on public.story_chapters to authenticated;
grant insert (story_project_id, user_id, chapter_number, title, summary, content, status) on public.story_chapters to authenticated;
grant update (chapter_number, title, summary, content, status, word_count) on public.story_chapters to authenticated;

grant all on all tables in schema public to service_role;

insert into public.subscription_plans (key, name, price_monthly, features, sort_order)
values
  ('free', 'Free', 0, '["1 AI manuscript review", "1 cover concept", "Writing workspace"]'::jsonb, 0),
  ('pro', 'Pro', 29, '["15 monthly reviews", "15 cover generations", "8 submission packages"]'::jsonb, 3),
  ('publisher', 'Publisher', 79, '["40 monthly reviews", "Team workspaces", "20 submission packages"]'::jsonb, 4)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'manuscripts', 'manuscripts', false, 52428800,
    array['text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  ),
  (
    'covers', 'covers', false, 20971520,
    array['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf']
  ),
  (
    'exports', 'exports', false, 104857600,
    array['application/pdf', 'application/epub+zip', 'application/zip']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authors can read accessible studio files" on storage.objects
for select to authenticated
using (
  bucket_id in ('manuscripts', 'covers', 'exports')
  and (select private.can_access_storage_object(name))
);
create policy "Authors can upload studio files" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('manuscripts', 'covers', 'exports')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Authors can update their studio files" on storage.objects
for update to authenticated
using (
  bucket_id in ('manuscripts', 'covers', 'exports')
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id in ('manuscripts', 'covers', 'exports')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Authors can delete their studio files" on storage.objects
for delete to authenticated
using (
  bucket_id in ('manuscripts', 'covers', 'exports')
  and owner_id = (select auth.uid())::text
);
