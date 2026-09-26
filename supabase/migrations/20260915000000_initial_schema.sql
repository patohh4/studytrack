create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  university text,
  course text,
  group_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default 'gray',
  source text not null default 'manual' check (source in ('manual', 'moodle')),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'moodle')),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create table public.moodle_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  base_url text not null,
  external_user_id text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

create index courses_user_id_idx on public.courses(user_id);
create index tasks_user_id_idx on public.tasks(user_id);
create index tasks_due_at_idx on public.tasks(user_id, due_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.tasks enable row level security;
alter table public.moodle_connections enable row level security;

create policy "Users can read their profile"
on public.profiles for select
using (auth.uid() = id or public.is_admin());

create policy "Users can update their profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can manage their courses"
on public.courses for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can read all courses"
on public.courses for select
using (public.is_admin());

create policy "Users can manage their tasks"
on public.tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can read all tasks"
on public.tasks for select
using (public.is_admin());

create policy "Users can manage their Moodle connection"
on public.moodle_connections for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can read all Moodle connections"
on public.moodle_connections for select
using (public.is_admin());
