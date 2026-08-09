-- Present four clear public membership tiers while retaining the legacy Pro key
-- for any existing subscriptions and webhook events.
update public.subscription_plans
set price_monthly = case key
  when 'starter' then 10
  when 'author' then 20
  when 'publisher' then 80
  else price_monthly
end,
updated_at = now()
where key in ('starter', 'author', 'publisher');
