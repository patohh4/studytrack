-- Таблиця для матеріалів курсу з Moodle
-- (лекції, файли, посилання, тести, форуми тощо)

create table if not exists public.course_materials (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,

  -- Що це за матеріал
  module_type text not null,        -- 'assign', 'resource', 'url', 'quiz', 'forum', 'label', etc.
  title       text not null,
  description text,
  url         text,                 -- пряме посилання на модуль в Moodle

  -- Для завдань
  due_at      timestamptz,          -- дедлайн (тільки для assign/quiz)

  -- Секція в курсі (тиждень/тема)
  section_name text,                -- назва секції, напр. "Тиждень 1"
  section_num  integer,             -- порядковий номер секції

  -- Moodle ідентифікатори
  external_id      text not null,   -- id модуля в Moodle
  external_course_id text not null, -- id курсу в Moodle

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, external_id)
);

create index course_materials_course_id_idx on public.course_materials(course_id);
create index course_materials_user_id_idx   on public.course_materials(user_id);
create index course_materials_due_at_idx    on public.course_materials(user_id, due_at)
  where due_at is not null;

-- updated_at тригер
create trigger course_materials_set_updated_at
before update on public.course_materials
for each row execute function public.set_updated_at();

-- RLS
alter table public.course_materials enable row level security;

create policy "Users can manage their course materials"
  on public.course_materials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can read all course materials"
  on public.course_materials for select
  using (public.is_admin());

notify pgrst, 'reload schema';
