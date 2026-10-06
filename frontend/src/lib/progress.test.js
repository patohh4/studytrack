import { beforeEach, describe, expect, test } from "vitest";
import { calcStreak, loadProgress, saveProgress, todayStr } from "./progress.js";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

describe("calcStreak", () => {
  test("0 for no completed tasks", () => {
    expect(calcStreak([{ completed_at: null }])).toBe(0);
  });

  test("counts consecutive days including today", () => {
    const tasks = [0, 1, 2].map((n) => ({ completed_at: daysAgo(n) }));
    expect(calcStreak(tasks)).toBe(3);
  });

  test("breaks on a gap", () => {
    const tasks = [0, 1, 3].map((n) => ({ completed_at: daysAgo(n) }));
    expect(calcStreak(tasks)).toBe(2);
  });
});

describe("progress storage", () => {
  beforeEach(() => localStorage.clear());

  test("returns defaults when empty", () => {
    expect(loadProgress("u1").streak).toBe(0);
  });

  test("saves and loads", () => {
    saveProgress("u1", { completedIds: [1], streak: 2, lastCompletedDate: todayStr() });
    expect(loadProgress("u1").completedIds).toEqual([1]);
  });
});
