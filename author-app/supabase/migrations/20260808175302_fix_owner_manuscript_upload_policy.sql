-- Keep new author uploads on the direct owner path. The earlier policy called
-- the legacy team-membership helper even when no workspace was selected, which
-- could recurse through workspace_members RLS.

drop policy if exists "Authors can create manuscripts" on public.manuscripts;

create policy "Authors can create manuscripts" on public.manuscripts
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and workspace_id is null
);
