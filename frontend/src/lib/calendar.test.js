import { expect, test } from "vitest";
import { buildMonth, groupByDay, shiftMonth } from "./calendar.js";

test("October 2026 starts on Thursday and has 31 days", () => {
  const cells = buildMonth(2026, 9);
  expect(cells.findIndex((day) => day === 1)).toBe(3);
  expect(cells.filter(Boolean)).toHaveLength(31);
  expect(cells.length % 7).toBe(0);
});

test("leap year February has 29 days", () => {
  expect(buildMonth(2024, 1).filter(Boolean)).toHaveLength(29);
});

test("groups tasks by day of the selected month", () => {
  const tasks = [
    { id: 1, dueAt: new Date(2026, 9, 12, 10).toISOString() },
    { id: 2, dueAt: new Date(2026, 9, 12, 15).toISOString() },
    { id: 3, dueAt: new Date(2026, 10, 1, 10).toISOString() },
    { id: 4, dueAt: null },
  ];
  const grouped = groupByDay(tasks, 2026, 9);
  expect(grouped[12].map((t) => t.id)).toEqual([1, 2]);
  expect(Object.keys(grouped)).toEqual(["12"]);
});

test("shifts month across year boundary", () => {
  expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
});
