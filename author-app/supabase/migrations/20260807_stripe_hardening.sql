-- Stripe customer identity, payment audit data, and replay-safe webhook processing.
alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.submission_packages
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists amount_total bigint,
  add column if not exists tax_total bigint,
  add column if not exists currency text,
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz;

create unique index if not exists submission_packages_stripe_checkout_session_id_key
  on public.submission_packages (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists submission_packages_stripe_payment_intent_id_key
  on public.submission_packages (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_webhook_events enable row level security;

-- Intentionally no browser-facing RLS policies. Only the server-side service role
-- can read or write Stripe webhook receipts.
revoke all on public.stripe_webhook_events from anon, authenticated;
grant all on public.stripe_webhook_events to service_role;
