import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import tasksRoutes from "./routes/tasks.js";
import coursesRoutes from "./routes/courses.js";
import eventsRoutes from "./routes/events.js";
import profileRoutes from "./routes/profile.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/profile", profileRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Не знайдено" });
});

app.use(errorHandler);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`StudyTrack API запущено на http://localhost:${PORT}`);
});
