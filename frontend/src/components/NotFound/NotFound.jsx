import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Сторінку не знайдено</h1>
      <p className={styles.note}>Можливо, адресу введено неправильно або сторінку видалено.</p>
      <Link to="/tasks" className={styles.link}>
        На головну
      </Link>
    </main>
  );
}
