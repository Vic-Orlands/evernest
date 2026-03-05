-- Allow collaborators in the same family to read each other's profile names/emails.

drop policy if exists "profiles: self read" on public.profiles;

create policy "profiles: family read"
on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.family_members viewer_membership
    join public.family_members target_membership
      on viewer_membership.family_id = target_membership.family_id
    where viewer_membership.user_id = auth.uid()
      and target_membership.user_id = public.profiles.id
  )
);
