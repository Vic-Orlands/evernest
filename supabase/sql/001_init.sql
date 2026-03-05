-- EverNest schema and RLS baseline
create extension if not exists "pgcrypto";

create type app_role as enum ('owner', 'editor', 'viewer');
create type media_type as enum ('image', 'video', 'voice');
create type capsule_status as enum ('scheduled', 'sent', 'cancelled');
create type export_status as enum ('queued', 'processing', 'done', 'failed');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role app_role not null default 'viewer',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(family_id, user_id)
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  first_name text not null,
  birth_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null,
  note text not null,
  media_type media_type not null,
  media_path text not null,
  voice_note_path text,
  captured_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_tags (
  memory_id uuid not null references public.memories(id) on delete cascade,
  tag text not null,
  primary key(memory_id, tag)
);

create table if not exists public.memory_comments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memory_reactions (
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key(memory_id, user_id)
);

create table if not exists public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  timezone text not null default 'UTC',
  hour smallint not null check (hour between 0 and 23),
  minute smallint not null check (minute between 0 and 59),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, family_id)
);

create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null,
  recipient_email text not null,
  release_at timestamptz not null,
  status capsule_status not null default 'scheduled',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.capsule_memories (
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  primary key(capsule_id, memory_id)
);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  target text not null,
  format text not null,
  status export_status not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  template_key text not null,
  label text not null,
  due_at date,
  completed_memory_id uuid references public.memories(id) on delete set null
);

create index if not exists idx_memories_family_captured on public.memories(family_id, captured_at desc);
create index if not exists idx_capsules_release_status on public.capsules(release_at, status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_memories_updated
before update on public.memories
for each row execute function public.touch_updated_at();

create trigger trg_exports_updated
before update on public.exports
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.memories enable row level security;
alter table public.memory_tags enable row level security;
alter table public.memory_comments enable row level security;
alter table public.memory_reactions enable row level security;
alter table public.reminder_rules enable row level security;
alter table public.capsules enable row level security;
alter table public.capsule_memories enable row level security;
alter table public.exports enable row level security;
alter table public.milestones enable row level security;

create or replace function public.is_family_member(f_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = f_id
      and fm.user_id = auth.uid()
  );
$$;

create or replace function public.has_family_write(f_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = f_id
      and fm.user_id = auth.uid()
      and fm.role in ('owner', 'editor')
  );
$$;

create policy "profiles: self read"
on public.profiles for select
using (id = auth.uid());

create policy "profiles: self write"
on public.profiles for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "families: members read"
on public.families for select
using (public.is_family_member(id));

create policy "families: owner write"
on public.families for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "family_members: member read"
on public.family_members for select
using (public.is_family_member(family_id));

create policy "family_members: owner manage"
on public.family_members for all
using (
  exists (
    select 1 from public.families f where f.id = family_id and f.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.families f where f.id = family_id and f.owner_id = auth.uid()
  )
);

create policy "children: family read"
on public.children for select
using (public.is_family_member(family_id));

create policy "children: family write"
on public.children for all
using (public.has_family_write(family_id))
with check (public.has_family_write(family_id));

create policy "memories: family read"
on public.memories for select
using (public.is_family_member(family_id));

create policy "memories: family write"
on public.memories for all
using (public.has_family_write(family_id))
with check (public.has_family_write(family_id));

create policy "memory_tags: by memory read"
on public.memory_tags for select
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
);

create policy "memory_tags: by memory write"
on public.memory_tags for all
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.has_family_write(m.family_id)
  )
)
with check (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.has_family_write(m.family_id)
  )
);

create policy "memory_comments: family read"
on public.memory_comments for select
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
);

create policy "memory_comments: family write"
on public.memory_comments for all
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.has_family_write(m.family_id)
  )
)
with check (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.has_family_write(m.family_id)
  )
);

create policy "memory_reactions: family read"
on public.memory_reactions for select
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
);

create policy "memory_reactions: family write"
on public.memory_reactions for all
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.has_family_write(m.family_id)
  )
)
with check (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.has_family_write(m.family_id)
  )
);

create policy "reminders: owner only"
on public.reminder_rules for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "capsules: family read"
on public.capsules for select
using (public.is_family_member(family_id));

create policy "capsules: family write"
on public.capsules for all
using (public.has_family_write(family_id))
with check (public.has_family_write(family_id));

create policy "capsule_memories: family read"
on public.capsule_memories for select
using (
  exists (
    select 1 from public.capsules c where c.id = capsule_id and public.is_family_member(c.family_id)
  )
);

create policy "capsule_memories: family write"
on public.capsule_memories for all
using (
  exists (
    select 1 from public.capsules c where c.id = capsule_id and public.has_family_write(c.family_id)
  )
)
with check (
  exists (
    select 1 from public.capsules c where c.id = capsule_id and public.has_family_write(c.family_id)
  )
);

create policy "exports: family read"
on public.exports for select
using (public.is_family_member(family_id));

create policy "exports: requester write"
on public.exports for insert
with check (requested_by = auth.uid() and public.is_family_member(family_id));

create policy "milestones: family read"
on public.milestones for select
using (
  exists (
    select 1 from public.children c where c.id = child_id and public.is_family_member(c.family_id)
  )
);

create policy "milestones: family write"
on public.milestones for all
using (
  exists (
    select 1 from public.children c where c.id = child_id and public.has_family_write(c.family_id)
  )
)
with check (
  exists (
    select 1 from public.children c where c.id = child_id and public.has_family_write(c.family_id)
  )
);
