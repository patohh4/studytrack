import { Router } from "express";
import { getDb } from "../data/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/events — події користувача.
 * Опційні query-параметри: from, to (ISO-дати) — фільтрують події за полем date.
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    let events = db.data.events.filter((e) => e.userId === req.userId);

    const { from, to } = req.query;
    if (from) {
      events = events.filter((e) => new Date(e.date) >= new Date(from));
    }
    if (to) {
      events = events.filter((e) => new Date(e.date) <= new Date(to));
    }

    res.json(events);
  } catch (err) {
    next(err);
  }
});

export default router;
