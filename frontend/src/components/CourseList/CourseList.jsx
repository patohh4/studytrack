import { useState } from "react";
import Button from "../Button/Button.jsx";
import CourseCard from "../CourseCard/CourseCard.jsx";
import Status from "../Status/Status.jsx";
import { useCourses, useCreateCourse } from "../../hooks/useCourses.js";
import { useTasks } from "../../hooks/useTasks.js";
import { courseProgress } from "../../lib/tasks.js";
import styles from "./CourseList.module.css";

export default function CourseList() {
  const { data: courses = [], isPending, error } = useCourses();
  const { data: tasks = [] } = useTasks();
  const createCourse = useCreateCourse();
  const [name, setName] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    createCourse.mutate({ name: name.trim() }, { onSuccess: () => setName("") });
  };

  return (
    <section>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Мої предмети</p>
        <h1 className={styles.title}>Курси</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Назва нового курсу"
          aria-label="Назва нового курсу"
        />
        <Button type="submit" icon="add" disabled={createCourse.isPending}>
          Додати курс
        </Button>
      </form>
      {createCourse.error && <p className={styles.error}>{createCourse.error.message}</p>}

      <Status
        loading={isPending}
        error={error}
        empty={!isPending && !error && courses.length === 0}
        emptyText="Курсів поки немає"
      />

      <div className={styles.grid}>
        {courses.map((course) => {
          const { total, percent } = courseProgress(tasks, course.id);
          return <CourseCard key={course.id} name={course.name} progress={percent} tasks={total} />;
        })}
      </div>
    </section>
  );
}
