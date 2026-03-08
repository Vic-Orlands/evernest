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

alter table public.reminder_rules
add column if not exists activity_enabled boolean not null default true,
add column if not exists nudges_enabled boolean not null default true;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  notification_type text not null,
  delivery_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, family_id, notification_type, delivery_key)
);

create index if not exists idx_notification_deliveries_user_family
on public.notification_deliveries(user_id, family_id, created_at desc);

alter table public.notification_deliveries enable row level security;
