alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists university text,
  add column if not exists course text,
  add column if not exists group_name text,
  add column if not exists role text not null default 'student';

update public.profiles
set role = 'student'
where role is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('student', 'admin'));
  end if;
end
$$;

alter table public.moodle_connections
  add column if not exists token text;

alter table public.tasks
  add column if not exists notes text,
  add column if not exists subtasks jsonb not null default '[]'::jsonb,
  add column if not exists is_important boolean not null default false;

notify pgrst, 'reload schema';

notify pgrst, 'reload schema';

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can create their profile'
  ) then
    create policy "Users can create their profile"
    on public.profiles for insert
    with check (auth.uid() = id);
  end if;
end
$$;