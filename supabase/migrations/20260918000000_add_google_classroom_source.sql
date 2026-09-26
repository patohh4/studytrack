-- Додаємо 'google_classroom' до дозволених значень source у таблицях courses та tasks

alter table public.courses
  drop constraint if exists courses_source_check;

alter table public.courses
  add constraint courses_source_check
  check (source in ('manual', 'moodle', 'google_classroom'));

alter table public.tasks
  drop constraint if exists tasks_source_check;

alter table public.tasks
  add constraint tasks_source_check
  check (source in ('manual', 'moodle', 'google_classroom'));
