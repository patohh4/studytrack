import { expect, test } from "vitest";
import { courseProgress, filterTasks, formatDue, getStats, isOverdue } from "./tasks.js";

const now = new Date("2026-10-15T12:00:00Z");
const tasks = [
  { id: 1, dueDate: "2026-10-10T10:00:00Z", status: "todo", completedAt: null, courseId: "a" },
  { id: 2, dueDate: "2026-10-20T10:00:00Z", status: "todo", completedAt: null, courseId: "a" },
  {
    id: 3,
    dueDate: "2026-10-01T10:00:00Z",
    status: "done",
    completedAt: "2026-10-02T10:00:00Z",
    courseId: "a",
  },
  { id: 4, dueDate: null, status: "todo", completedAt: null, courseId: "b" },
];

test("overdue only for active tasks with past due date", () => {
  expect(isOverdue(tasks[0], now)).toBe(true);
  expect(isOverdue(tasks[1], now)).toBe(false);
  expect(isOverdue(tasks[2], now)).toBe(false);
  expect(isOverdue(tasks[3], now)).toBe(false);
});

test("calculates statistics", () => {
  expect(getStats(tasks, now)).toEqual({ total: 4, done: 1, overdue: 1 });
});

test("filters tasks", () => {
  expect(filterTasks(tasks, "all")).toHaveLength(4);
  expect(filterTasks(tasks, "active").map((t) => t.id)).toEqual([1, 2, 4]);
  expect(filterTasks(tasks, "done").map((t) => t.id)).toEqual([3]);
});

test("calculates course progress", () => {
  expect(courseProgress(tasks, "a")).toEqual({ total: 3, done: 1, percent: 33 });
  expect(courseProgress(tasks, "missing")).toEqual({ total: 0, done: 0, percent: 0 });
});

test("formats missing due date", () => {
  expect(formatDue(null)).toBe("Без терміну");
});
