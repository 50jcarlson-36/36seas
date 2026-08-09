-- Keep purchased-credit usage lookups and grant cleanup efficient.
create index if not exists credit_usage_grant_id_idx
  on public.credit_usage (grant_id)
  where grant_id is not null;
