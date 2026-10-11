import styles from "./TaskCard.module.css";

export default function TaskCard({ title, course, due, important, done, overdue }) {
  return (
    <article
      className={`${styles.card} ${overdue ? styles.overdue : ""} ${done ? styles.done : ""}`}
    >
      <input type="checkbox" className={styles.check} defaultChecked={done} aria-label={title} />
      <div className={styles.body}>
        <h3 className={styles.title}>
          {title}
          {important && <span className={`material-symbols-outlined ${styles.star}`}>star</span>}
        </h3>
        <p className={styles.course}>{course}</p>
      </div>
      <span className={`${styles.due} ${overdue ? styles.dueOverdue : ""}`}>{due}</span>
    </article>
  );
}
