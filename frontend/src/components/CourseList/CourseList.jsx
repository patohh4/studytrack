import CourseCard from "../CourseCard/CourseCard.jsx";
import { courses } from "../../data/mock.js";
import styles from "./CourseList.module.css";

export default function CourseList() {
  return (
    <section>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Moodle</p>
        <h1 className={styles.title}>Курси</h1>
      </header>

      <div className={styles.grid}>
        {courses.map((course) => (
          <CourseCard key={course.id} {...course} />
        ))}
      </div>
    </section>
  );
}
