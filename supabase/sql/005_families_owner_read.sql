-- Let family owners read their owned family even if membership rows are missing.

drop policy if exists "families: members read" on public.families;

create policy "families: owner or members read"
on public.families for select
using (
  owner_id = auth.uid()
  or public.is_family_member(id)
);
