export const MONTH_NAMES = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

/**
 * Повертає масив комірок календаря (понеділок — перший день тижня).
 * Порожні комірки на початку й в кінці — null, решта — номери днів.
 */
export function buildMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Групує завдання за днем місяця: { 12: [task, ...] }. */
export function groupByDay(tasks, year, month) {
  const result = {};
  for (const task of tasks) {
    if (!task.dueAt) continue;
    const date = new Date(task.dueAt);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const day = date.getDate();
    (result[day] ??= []).push(task);
  }
  return result;
}

/** Зсув місяця з урахуванням переходу між роками. */
export function shiftMonth(year, month, delta) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}
