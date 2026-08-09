-- Expand the author membership ladder and keep existing Pro/Publisher members valid.
insert into public.subscription_plans (key, name, price_monthly, features, sort_order)
values
  ('free', 'Free', 0, '["1 AI manuscript review", "1 cover concept", "Writing workspace", "Try before you subscribe"]'::jsonb, 0),
  ('starter', 'Starter', 10, '["3 reviews and covers monthly", "1 submission package", "10 story-builder credits", "5% expert-service savings"]'::jsonb, 1),
  ('author', 'Author', 20, '["7 reviews and covers monthly", "3 submission packages", "25 story-builder credits", "10% expert-service savings"]'::jsonb, 2),
  ('pro', 'Pro', 29, '["15 reviews and covers monthly", "8 submission packages", "60 story-builder credits", "15–20% expert-service savings"]'::jsonb, 3),
  ('publisher', 'Publisher', 80, '["40 reviews and covers monthly", "20 submission packages", "Team workspaces", "Highest preferred service rates"]'::jsonb, 4)
on conflict (key) do update set
  name = excluded.name,
  price_monthly = excluded.price_monthly,
  features = excluded.features,
  sort_order = excluded.sort_order;

-- Some earlier installs used a check constraint on the profile tier. Replace only
-- the constraint that references this column, then allow the expanded ladder.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'profiles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%subscription_tier%'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_subscription_tier_check
  check (subscription_tier in ('free', 'starter', 'author', 'pro', 'publisher'));
