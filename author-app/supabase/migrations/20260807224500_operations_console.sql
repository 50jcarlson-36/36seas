-- Secure operations console for 36Seas staff and contractors.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'worker', 'manager', 'admin'));

create table if not exists public.operations_assignments (
  id uuid primary key default gen_random_uuid(),
  work_type text not null check (work_type in ('submission_package', 'service_order', 'service_request')),
  work_id uuid not null,
  title text not null,
  author_id uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null,
  status text not null default 'unassigned'
    check (status in ('unassigned', 'queued', 'in_progress', 'blocked', 'quality_review', 'completed', 'cancelled')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_type, work_id)
);

create table if not exists public.operations_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  work_type text,
  work_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operations_assignments_assignee_status_idx
  on public.operations_assignments (assigned_to, status, due_at);
create index if not exists operations_assignments_status_priority_idx
  on public.operations_assignments (status, priority, created_at desc);
create index if not exists operations_events_work_idx
  on public.operations_events (work_type, work_id, created_at desc);

create trigger operations_assignments_touch_updated_at
before update on public.operations_assignments
for each row execute function private.touch_updated_at();

alter table public.operations_assignments enable row level security;
alter table public.operations_events enable row level security;

-- Operations records are exposed only through server-side routes after role checks.
revoke all on public.operations_assignments, public.operations_events from anon, authenticated;
grant all on public.operations_assignments, public.operations_events to service_role;

-- Browser clients may read their own profile, including the staff role needed by navigation.
grant select on public.profiles to authenticated;
