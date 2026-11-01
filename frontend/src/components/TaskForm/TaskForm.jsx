import { useState } from "react";
import Button from "../Button/Button.jsx";
import { useCreateTask } from "../../hooks/useTasks.js";
import { useCourses } from "../../hooks/useCourses.js";
import styles from "./TaskForm.module.css";

export default function TaskForm({ onDone }) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [courseId, setCourseId] = useState("");
  const createTask = useCreateTask();
  const { data: courses = [] } = useCourses();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    createTask.mutate(
      {
        title: title.trim(),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        courseId: courseId || null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDueAt("");
          setCourseId("");
          onDone?.();
        },
      },
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Назва
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className={styles.field}>
        Термін
        <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </label>
      <label className={styles.field}>
        Курс
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Без курсу</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </label>

      {createTask.error && <p className={styles.error}>{createTask.error.message}</p>}

      <Button type="submit" disabled={createTask.isPending}>
        {createTask.isPending ? "Збереження…" : "Додати завдання"}
      </Button>
    </form>
  );
}
