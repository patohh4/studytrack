import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getDb, seedUser } from "../data/db.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, "Ім'я обов'язкове"),
  email: z.string().email("Некоректний email"),
  password: z.string().min(6, "Пароль мінімум 6 символів"),
});

const loginSchema = z.object({
  email: z.string().email("Некоректний email"),
  password: z.string().min(1, "Пароль обов'язковий"),
});

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

/** POST /api/auth/register {name, email, password} */
router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const db = await getDb();
    const { name, email, password } = req.body;

    const exists = db.data.users.find((u) => u.email === email);
    if (exists) {
      return res.status(400).json({ message: "Користувач з таким email вже існує" });
    }

    const userId = `u-${Date.now()}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { id: userId, name, email, password: hashedPassword };
    db.data.users.push(user);
    await db.write();

    // Демо-дані для нового користувача
    await seedUser(userId);

    const token = signToken(userId);
    res.status(201).json({
      token,
      user: { id: userId, name, email },
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/login {email, password} -> {token, user} */
router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const db = await getDb();
    const { email, password } = req.body;

    const user = db.data.users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ message: "Невірний email або пароль" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Невірний email або пароль" });
    }

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me — повертає поточного користувача (потребує токен) */
router.get("/me", async (req, res, next) => {
  try {
    // Перевірка токена інлайн, щоб не залежати від requireAuth тут
    const jwt = (await import("jsonwebtoken")).default;
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Необхідно авторизуватись" });
    }
    let payload;
    try {
      payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Недійсний або прострочений токен" });
    }

    const db = await getDb();
    const user = db.data.users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(404).json({ message: "Користувача не знайдено" });
    }
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
});

export default router;
