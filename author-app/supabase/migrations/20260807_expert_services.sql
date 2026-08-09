-- Human manuscript evaluations and managed ghostwriting inquiries.
create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manuscript_id uuid references public.manuscripts(id) on delete set null,
  service_type text not null check (service_type in ('human_manuscript_evaluation')),
  member_tier text not null default 'free',
  discount_percent integer not null default 0,
  status text not null default 'checkout_pending',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_total bigint,
  tax_total bigint,
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists service_orders_stripe_checkout_session_id_key
  on public.service_orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists service_orders_stripe_payment_intent_id_key
  on public.service_orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists service_orders_user_created_idx
  on public.service_orders (user_id, created_at desc);
create index if not exists service_orders_manuscript_id_idx
  on public.service_orders (manuscript_id);

alter table public.service_orders enable row level security;

drop policy if exists "Authors can read their service orders" on public.service_orders;
create policy "Authors can read their service orders"
  on public.service_orders for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.current_user_is_admin()));

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manuscript_id uuid references public.manuscripts(id) on delete set null,
  service_type text not null check (service_type in ('managed_ghostwriting')),
  member_tier text not null default 'free',
  discount_percent integer not null default 0,
  genre text,
  target_word_count integer,
  brief text not null,
  status text not null default 'new',
  quoted_amount bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_requests enable row level security;

create index if not exists service_requests_user_created_idx
  on public.service_requests (user_id, created_at desc);
create index if not exists service_requests_manuscript_id_idx
  on public.service_requests (manuscript_id);

drop policy if exists "Authors can read their service requests" on public.service_requests;
create policy "Authors can read their service requests"
  on public.service_requests for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.current_user_is_admin()));

create trigger service_orders_touch_updated_at before update on public.service_orders
for each row execute function private.touch_updated_at();
create trigger service_requests_touch_updated_at before update on public.service_requests
for each row execute function private.touch_updated_at();

revoke all on public.service_orders, public.service_requests from anon, authenticated;
grant select on public.service_orders to authenticated;
grant select on public.service_requests to authenticated;
grant all on public.service_orders, public.service_requests to service_role;
