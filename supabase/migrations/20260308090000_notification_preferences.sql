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
