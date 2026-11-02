import { Router } from "express";
import { z } from "zod";
import { getDb } from "../data/db.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const updateSchema = z.object({
  name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  achievements: z.array(z.any()).optional(),
});

/** GET /api/profile — профіль поточного користувача */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    let profile = db.data.profiles.find((p) => p.userId === req.userId);

    // Якщо профілю немає (наприклад, створено до seed), повертаємо порожній
    if (!profile) {
      profile = {
        id: `${req.userId}-profile`,
        userId: req.userId,
        name: null,
        avatar: null,
        achievements: [],
      };
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/profile — оновити профіль */
router.patch("/", requireAuth, validateBody(updateSchema), async (req, res, next) => {
  try {
    const db = await getDb();
    let profile = db.data.profiles.find((p) => p.userId === req.userId);

    if (!profile) {
      profile = {
        id: `${req.userId}-profile`,
        userId: req.userId,
        name: null,
        avatar: null,
        achievements: [],
      };
      db.data.profiles.push(profile);
    }

    Object.assign(profile, req.body);
    await db.write();
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
