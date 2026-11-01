import { Link } from "react-router-dom";
import styles from "./TaskCard.module.css";

export default function TaskCard({ id, title, course, due, done, overdue, onToggle }) {
  return (
    <article
      className={`${styles.card} ${overdue ? styles.overdue : ""} ${done ? styles.done : ""}`}
    >
      <input
        type="checkbox"
        className={styles.check}
        checked={done}
        onChange={() => onToggle?.(id, !done)}
        aria-label={`Виконано: ${title}`}
      />
      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link to={`/tasks/${id}`} className={styles.link}>
            {title}
          </Link>
        </h3>
        <p className={styles.course}>{course ?? "Без курсу"}</p>
      </div>
      <span className={`${styles.due} ${overdue ? styles.dueOverdue : ""}`}>{due}</span>
    </article>
  );
}
