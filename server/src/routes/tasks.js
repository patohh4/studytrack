import { Router } from "express";
import { z } from "zod";
import { getDb } from "../data/db.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const createSchema = z.object({
  title: z.string().min(1, "Назва обов'язкова"),
  description: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

/** GET /api/tasks — список завдань поточного користувача */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const tasks = db.data.tasks.filter((t) => t.userId === req.userId);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

/** POST /api/tasks — створити завдання */
router.post("/", requireAuth, validateBody(createSchema), async (req, res, next) => {
  try {
    const db = await getDb();
    const task = {
      id: `t-${Date.now()}`,
      userId: req.userId,
      title: req.body.title,
      description: req.body.description ?? null,
      courseId: req.body.courseId ?? null,
      dueDate: req.body.dueDate ?? null,
      status: req.body.status ?? "todo",
      priority: req.body.priority ?? "medium",
      completedAt: req.body.status === "done" ? new Date().toISOString() : null,
    };
    db.data.tasks.push(task);
    await db.write();
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/tasks/:id — оновити завдання */
router.patch("/:id", requireAuth, validateBody(updateSchema), async (req, res, next) => {
  try {
    const db = await getDb();
    const task = db.data.tasks.find((t) => t.id === req.params.id && t.userId === req.userId);
    if (!task) {
      return res.status(404).json({ message: "Завдання не знайдено" });
    }

    Object.assign(task, req.body);
    if (req.body.status === "done" && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }
    if (req.body.status && req.body.status !== "done") {
      task.completedAt = null;
    }
    await db.write();
    res.json(task);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/tasks/:id — видалити завдання */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const idx = db.data.tasks.findIndex((t) => t.id === req.params.id && t.userId === req.userId);
    if (idx === -1) {
      return res.status(404).json({ message: "Завдання не знайдено" });
    }
    db.data.tasks.splice(idx, 1);
    await db.write();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
