-- Додаємо нові колонки для MoodleSession+sesskey підходу
-- (стовпець token залишається для зворотної сумісності з moodle-sync)

alter table public.moodle_connections
  add column if not exists moodle_session text,
  add column if not exists sesskey text;

-- Оновлюємо RLS policy якщо ще немає права на update
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'moodle_connections'
      and policyname = 'Users can manage their Moodle connection'
  ) then
    create policy "Users can manage their Moodle connection"
      on public.moodle_connections for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

notify pgrst, 'reload schema';
