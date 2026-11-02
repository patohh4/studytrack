import { Router } from "express";
import { z } from "zod";
import { getDb } from "../data/db.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1, "Назва курсу обов'язкова"),
});

/** GET /api/courses — список курсів поточного користувача */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const courses = db.data.courses
      .filter((c) => c.userId === req.userId)
      .sort((a, b) => a.name.localeCompare(b.name, "uk"));
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

/** POST /api/courses — створити курс */
router.post("/", requireAuth, validateBody(createSchema), async (req, res, next) => {
  try {
    const db = await getDb();
    const course = {
      id: `c-${Date.now()}`,
      userId: req.userId,
      name: req.body.name,
    };
    db.data.courses.push(course);
    await db.write();
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
});

export default router;
