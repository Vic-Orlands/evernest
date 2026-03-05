-- EverNest security and collaboration upgrades

-- Allow all family members (including viewers) to comment and react.
drop policy if exists "memory_comments: family write" on public.memory_comments;
drop policy if exists "memory_reactions: family write" on public.memory_reactions;

create policy "memory_comments: member write"
on public.memory_comments for all
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
)
with check (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
);

create policy "memory_reactions: member write"
on public.memory_reactions for all
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
)
with check (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
);

create table if not exists public.collaboration_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invited_email text not null,
  invited_role app_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (invited_role in ('editor', 'viewer'))
);

create index if not exists idx_collab_invites_family on public.collaboration_invites(family_id);
create index if not exists idx_collab_invites_expires on public.collaboration_invites(expires_at);

alter table public.collaboration_invites enable row level security;

create policy "collab_invites: family read"
on public.collaboration_invites for select
using (public.is_family_member(family_id));

create policy "collab_invites: writer create"
on public.collaboration_invites for insert
with check (public.has_family_write(family_id) and inviter_id = auth.uid());

create policy "collab_invites: owner update"
on public.collaboration_invites for update
using (public.has_family_write(family_id));

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_family_created on public.audit_events(family_id, created_at desc);

alter table public.audit_events enable row level security;

create policy "audit_events: family read"
on public.audit_events for select
using (family_id is null or public.is_family_member(family_id));

create policy "audit_events: actor insert"
on public.audit_events for insert
with check (actor_id = auth.uid());

-- Private storage bucket for family media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-media',
  'memory-media',
  false,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'audio/m4a',
    'audio/mp4',
    'audio/aac',
    'audio/x-m4a'
  ]
)
on conflict (id) do nothing;

drop policy if exists "memory-media: select" on storage.objects;
drop policy if exists "memory-media: insert" on storage.objects;
drop policy if exists "memory-media: update" on storage.objects;
drop policy if exists "memory-media: delete" on storage.objects;

create policy "memory-media: select"
on storage.objects for select
using (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.is_family_member(((storage.foldername(name))[1])::uuid)
);

create policy "memory-media: insert"
on storage.objects for insert
with check (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.has_family_write(((storage.foldername(name))[1])::uuid)
);

create policy "memory-media: update"
on storage.objects for update
using (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.has_family_write(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.has_family_write(((storage.foldername(name))[1])::uuid)
);

create policy "memory-media: delete"
on storage.objects for delete
using (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-fA-F-]{36}$'
  and public.has_family_write(((storage.foldername(name))[1])::uuid)
);

-- Auto-provision user profile on signup.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();
