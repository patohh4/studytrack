const defaultProgress = {
  completedIds: [],
  streak: 0,
  lastCompletedDate: null, // "YYYY-MM-DD" — день останнього виконаного завдання
};

const getProgressKey = (userId) => `studytrack-progress-v2-${userId || "guest"}`;

export function loadProgress(userId) {
  try {
    const stored = localStorage.getItem(getProgressKey(userId));
    if (!stored) return defaultProgress;

    const parsed = JSON.parse(stored);
    return {
      completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
      streak: Number.isFinite(parsed.streak) ? parsed.streak : 0,
      lastCompletedDate: parsed.lastCompletedDate || null,
    };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(userId, progress) {
  localStorage.setItem(getProgressKey(userId), JSON.stringify(progress));
}

/** Повертає рядок "YYYY-MM-DD" для поточного локального дня */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Перераховує стрік на основі completedAt-дат з БД.
 * tasks — масив об'єктів з полем completed_at (ISO string або null).
 * Повертає число — кількість послідовних днів до сьогодні включно.
 */
export function calcStreak(tasks) {
  const days = new Set(
    tasks
      .filter((t) => t.completed_at)
      .map((t) => {
        const d = new Date(t.completed_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }),
  );

  if (days.size === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (days.has(key)) {
      streak++;
    } else if (i > 0) {
      // Пропуск — стрік перервано
      break;
    }
    // i === 0 (сьогодні) — якщо сьогодні нічого не виконано, продовжуємо перевіряти вчора
  }

  return streak;
}
