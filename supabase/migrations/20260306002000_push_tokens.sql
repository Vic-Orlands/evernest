-- Push notification token storage
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'ios',
  created_at timestamptz not null default now(),
  unique(user_id, token)
);

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens: self read"
on public.push_tokens for select
using (user_id = auth.uid());

create policy "push_tokens: self write"
on public.push_tokens for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Allow family members to read each other's tokens (for push notifications)
create policy "push_tokens: family read"
on public.push_tokens for select
using (
  exists (
    select 1
    from public.family_members viewer_membership
    join public.family_members target_membership
      on viewer_membership.family_id = target_membership.family_id
    where viewer_membership.user_id = auth.uid()
      and target_membership.user_id = public.push_tokens.user_id
  )
);
