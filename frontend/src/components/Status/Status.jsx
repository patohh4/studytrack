import styles from "./Status.module.css";

/** Показує стан завантаження, помилку або порожній список. */
export default function Status({ loading, error, empty, emptyText = "Нічого не знайдено" }) {
  if (loading) return <p className={styles.note}>Завантаження…</p>;
  if (error) return <p className={`${styles.note} ${styles.error}`}>{error.message}</p>;
  if (empty) return <p className={styles.note}>{emptyText}</p>;
  return null;
}
