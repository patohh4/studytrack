alter table public.user_settings
  add column if not exists sync_interval_minutes integer not null default 30
    check (sync_interval_minutes in (0, 15, 30, 60));

notify pgrst, 'reload schema';
