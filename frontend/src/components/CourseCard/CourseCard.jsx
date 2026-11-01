import styles from "./CourseCard.module.css";

export default function CourseCard({ name, progress, tasks }) {
  return (
    <article className={styles.card}>
      <h3 className={styles.name}>{name}</h3>

      <div className={styles.progressRow}>
        <span>Прогрес</span>
        <span>{progress}%</span>
      </div>
      <div className={styles.track}>
        <div className={styles.bar} style={{ width: `${progress}%` }} />
      </div>

      <p className={styles.tasks}>Завдань: {tasks}</p>
    </article>
  );
}
