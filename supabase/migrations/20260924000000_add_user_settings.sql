-- Таблиця налаштувань користувача
create table if not exists public.user_settings (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  streaks_enabled     boolean not null default true,
  notif_streak_enabled boolean not null default false,
  notif_hour          integer not null default 20 check (notif_hour between 0 and 23),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "Users can manage their settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
