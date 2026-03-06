alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_config jsonb,
  add column if not exists personalization jsonb,
  add column if not exists personalization_completed_at timestamptz;

create or replace function public.can_access_profile_media(profile_user_id uuid)
returns boolean
language sql
stable
as $$
  select
    profile_user_id = auth.uid()
    or exists (
      select 1
      from public.family_members viewer_membership
      join public.family_members target_membership
        on viewer_membership.family_id = target_membership.family_id
      where viewer_membership.user_id = auth.uid()
        and target_membership.user_id = profile_user_id
    );
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  false,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "profile-media: select" on storage.objects;
drop policy if exists "profile-media: insert" on storage.objects;
drop policy if exists "profile-media: update" on storage.objects;
drop policy if exists "profile-media: delete" on storage.objects;

create policy "profile-media: select"
on storage.objects for select
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.can_access_profile_media(((storage.foldername(name))[1])::uuid)
);

create policy "profile-media: insert"
on storage.objects for insert
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile-media: update"
on storage.objects for update
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile-media: delete"
on storage.objects for delete
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
