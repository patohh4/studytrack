import { JSONFilePreset } from "lowdb/node";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "..", process.env.DB_FILE ?? "db.json");

const DEFAULTS = {
  users: [],
  tasks: [],
  courses: [],
  events: [],
  profiles: [],
};

let _db = null;

export async function getDb() {
  if (!_db) {
    _db = await JSONFilePreset(DB_PATH, DEFAULTS);
  }
  return _db;
}

/**
 * Наповнює демо-даними для нового користувача, щоб фронтенд
 * одразу мав що показати після реєстрації.
 */
export async function seedUser(userId) {
  const db = await getDb();

  const now = new Date();
  const day = (n) => new Date(now.getTime() + n * 86_400_000).toISOString();

  const courseIds = ["c1", "c2", "c3"].map((s) => `${userId}-${s}`);

  const courses = [
    { id: courseIds[0], userId, name: "Веб-технології" },
    { id: courseIds[1], userId, name: "Алгоритми та структури даних" },
    { id: courseIds[2], userId, name: "Бази даних" },
  ];

  const tasks = [
    {
      id: `${userId}-t1`,
      userId,
      title: "Лабораторна №7 — Express API",
      description: "Реалізувати бекенд і підключити до фронтенду",
      courseId: courseIds[0],
      dueDate: day(3),
      status: "in_progress",
      priority: "high",
      completedAt: null,
    },
    {
      id: `${userId}-t2`,
      userId,
      title: "Підготуватись до іспиту",
      description: "Повторити теорію: складність алгоритмів, сортування",
      courseId: courseIds[1],
      dueDate: day(7),
      status: "todo",
      priority: "medium",
      completedAt: null,
    },
    {
      id: `${userId}-t3`,
      userId,
      title: "Виконати самостійну роботу з SQL",
      description: "Написати 10 запитів до тестової БД",
      courseId: courseIds[2],
      dueDate: day(-1),
      status: "done",
      priority: "low",
      completedAt: day(-1),
    },
    {
      id: `${userId}-t4`,
      userId,
      title: "Здати реферат",
      description: null,
      courseId: courseIds[0],
      dueDate: day(14),
      status: "todo",
      priority: "low",
      completedAt: null,
    },
  ];

  const events = [
    {
      id: `${userId}-e1`,
      userId,
      title: "Лекція: REST API",
      date: day(1),
      type: "lecture",
    },
    {
      id: `${userId}-e2`,
      userId,
      title: "Здача лабораторної",
      date: day(3),
      type: "deadline",
    },
    {
      id: `${userId}-e3`,
      userId,
      title: "Консультація перед іспитом",
      date: day(6),
      type: "consultation",
    },
  ];

  const profile = {
    id: `${userId}-profile`,
    userId,
    name: null,
    avatar: null,
    achievements: [
      { id: "first_task", title: "Перше завдання", unlockedAt: now.toISOString() },
    ],
  };

  db.data.courses.push(...courses);
  db.data.tasks.push(...tasks);
  db.data.events.push(...events);
  db.data.profiles.push(profile);
  await db.write();
}
