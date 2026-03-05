-- Export storage enhancements

alter table public.exports
  add column if not exists result_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'export-packages',
  'export-packages',
  false,
  524288000,
  array['application/json', 'application/zip']
)
on conflict (id) do nothing;

drop policy if exists "export-packages: select" on storage.objects;
drop policy if exists "export-packages: insert" on storage.objects;
drop policy if exists "export-packages: update" on storage.objects;
drop policy if exists "export-packages: delete" on storage.objects;

create policy "export-packages: select"
on storage.objects for select
using (
  bucket_id = 'export-packages'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.is_family_member(((storage.foldername(name))[1])::uuid)
);

create policy "export-packages: insert"
on storage.objects for insert
with check (
  bucket_id = 'export-packages'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.has_family_write(((storage.foldername(name))[1])::uuid)
);

create policy "export-packages: update"
on storage.objects for update
using (
  bucket_id = 'export-packages'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.has_family_write(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'export-packages'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.has_family_write(((storage.foldername(name))[1])::uuid)
);

create policy "export-packages: delete"
on storage.objects for delete
using (
  bucket_id = 'export-packages'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.has_family_write(((storage.foldername(name))[1])::uuid)
);
