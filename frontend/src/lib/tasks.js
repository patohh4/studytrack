/** Бізнес-логіка завдань: статуси, фільтри, статистика. */

export const isDone = (task) => Boolean(task.completed_at);

export const isOverdue = (task, now = new Date()) =>
  !isDone(task) && Boolean(task.due_at) && new Date(task.due_at) < now;

export function getStats(tasks, now = new Date()) {
  return {
    total: tasks.length,
    done: tasks.filter(isDone).length,
    overdue: tasks.filter((task) => isOverdue(task, now)).length,
  };
}

export const FILTERS = [
  { id: "all", label: "Усі" },
  { id: "active", label: "Активні" },
  { id: "done", label: "Виконані" },
];

export function filterTasks(tasks, filter) {
  if (filter === "active") return tasks.filter((task) => !isDone(task));
  if (filter === "done") return tasks.filter(isDone);
  return tasks;
}

export function formatDue(dueAt) {
  if (!dueAt) return "Без терміну";
  return new Date(dueAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

/** Прогрес курсу — відсоток виконаних завдань. */
export function courseProgress(tasks, courseId) {
  const own = tasks.filter((task) => task.course_id === courseId);
  if (own.length === 0) return { total: 0, done: 0, percent: 0 };
  const done = own.filter(isDone).length;
  return { total: own.length, done, percent: Math.round((done / own.length) * 100) };
}
