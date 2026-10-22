import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../Button/Button.jsx";
import styles from "./Login.module.css";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate("/tasks"); // без бізнес-логіки: просто перехід на головну
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.promo}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>
              <span className="material-symbols-outlined">school</span>
            </span>
            StudyTrack
          </div>
          <div>
            <p className={styles.eyebrowLight}>Твій навчальний ритм</p>
            <h1 className={styles.promoTitle}>Повернись до своїх цілей.</h1>
          </div>
          <p className={styles.promoNote}>Усі дедлайни, курси й досягнення в одному місці</p>
        </div>

        <div className={styles.formSide}>
          <p className={styles.eyebrow}>Раді тебе бачити</p>
          <h2 className={styles.title}>{isRegister ? "Створити акаунт" : "Увійти в акаунт"}</h2>
          <p className={styles.subtitle}>Продовжуй планувати навчання без зайвого шуму.</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            {isRegister && (
              <label className={styles.field}>
                Ім&apos;я
                <input type="text" placeholder="Станіслав" />
              </label>
            )}
            <label className={styles.field}>
              Email
              <input type="email" placeholder="you@uzhnu.edu.ua" />
            </label>
            <label className={styles.field}>
              Пароль
              <input type="password" placeholder="••••••••" />
            </label>

            <Button type="submit">{isRegister ? "Зареєструватися" : "Увійти"}</Button>
            <Button type="button" variant="secondary" icon="account_circle">
              Продовжити з Google
            </Button>
          </form>

          <p className={styles.switch}>
            {isRegister ? "Вже є акаунт?" : "Немає акаунта?"}{" "}
            <button
              type="button"
              className={styles.link}
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Увійти" : "Зареєструватися"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
