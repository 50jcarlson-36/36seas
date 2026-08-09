-- Allow owners to read and update rows directly. This explicit owner branch lets
-- PostgREST safely return newly inserted rows while row-level security is active.

drop policy if exists "Manuscripts are visible to owners and teams" on public.manuscripts;
create policy "Manuscripts are visible to owners and teams" on public.manuscripts
for select to authenticated
using (
  user_id = (select auth.uid())
  or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  or (select private.current_user_is_admin())
);

drop policy if exists "Owners and teams can update manuscripts" on public.manuscripts;
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

drop policy if exists "Stories are visible to owners and teams" on public.story_projects;
create policy "Stories are visible to owners and teams" on public.story_projects
for select to authenticated
using (
  user_id = (select auth.uid())
  or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  or (select private.current_user_is_admin())
);

drop policy if exists "Authors can update accessible stories" on public.story_projects;
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
