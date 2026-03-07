create table if not exists public.memory_assets (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  media_type media_type not null check (media_type in ('image', 'video')),
  media_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.memory_voice_notes (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  audio_path text not null,
  duration_ms integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_memory_assets_memory_order on public.memory_assets(memory_id, sort_order);
create index if not exists idx_memory_voice_notes_memory_order on public.memory_voice_notes(memory_id, sort_order);

insert into public.memory_assets (memory_id, media_type, media_path, sort_order)
select m.id, m.media_type, m.media_path, 0
from public.memories m
where m.media_type in ('image', 'video')
  and not exists (
    select 1
    from public.memory_assets ma
    where ma.memory_id = m.id
  );

insert into public.memory_voice_notes (memory_id, audio_path, duration_ms, sort_order)
select m.id, coalesce(m.voice_note_path, m.media_path), null, 0
from public.memories m
where (m.voice_note_path is not null or m.media_type = 'voice')
  and not exists (
    select 1
    from public.memory_voice_notes mvn
    where mvn.memory_id = m.id
  );

alter table public.memory_assets enable row level security;
alter table public.memory_voice_notes enable row level security;

create policy "memory_assets: by memory read"
on public.memory_assets for select
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
);

create policy "memory_assets: by memory write"
on public.memory_assets for all
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

create policy "memory_voice_notes: by memory read"
on public.memory_voice_notes for select
using (
  exists (
    select 1 from public.memories m where m.id = memory_id and public.is_family_member(m.family_id)
  )
);

create policy "memory_voice_notes: by memory write"
on public.memory_voice_notes for all
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
