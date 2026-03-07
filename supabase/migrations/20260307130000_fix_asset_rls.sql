-- Drop the existing strict insert policies
drop policy if exists "memory_assets: by memory write" on public.memory_assets;
drop policy if exists "memory_voice_notes: by memory write" on public.memory_voice_notes;

-- Re-create write policies
-- For UPDATE and DELETE, we still check the actual family access
-- For INSERT, we allow it if the memory belongs to a family the user can write to.

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
