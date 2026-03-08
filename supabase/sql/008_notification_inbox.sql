alter table public.reminder_rules
add column if not exists child_id uuid references public.children(id) on delete set null,
add column if not exists on_this_day_enabled boolean not null default true,
add column if not exists quiet_hours_start_hour smallint check (quiet_hours_start_hour between 0 and 23),
add column if not exists quiet_hours_end_hour smallint check (quiet_hours_end_hour between 0 and 23);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  notification_type text not null,
  title text not null,
  body text not null,
  url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_created
on public.user_notifications(user_id, created_at desc);

alter table public.user_notifications enable row level security;

create policy "user_notifications: self read"
on public.user_notifications for select
using (user_id = auth.uid());

create policy "user_notifications: self update"
on public.user_notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
