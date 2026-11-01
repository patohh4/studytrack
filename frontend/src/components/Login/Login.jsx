import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../Button/Button.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "./Login.module.css";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { session, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  if (session) return <Navigate to="/tasks" replace />;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (isRegister) {
        const { needsConfirmation } = await signUp(form.email, form.password, form.name);
        if (needsConfirmation) {
          setMessage("Реєстрація успішна. Підтвердіть пошту за листом, а потім увійдіть.");
          setIsRegister(false);
          return;
        }
      } else {
        await signIn(form.email, form.password);
      }
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
                <input
                  type="text"
                  placeholder="Станіслав"
                  value={form.name}
                  onChange={update("name")}
                />
              </label>
            )}
            <label className={styles.field}>
              Email
              <input
                type="email"
                placeholder="you@uzhnu.edu.ua"
                value={form.email}
                onChange={update("email")}
                required
              />
            </label>
            <label className={styles.field}>
              Пароль
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={update("password")}
                required
                minLength={6}
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}
            {message && <p className={styles.success}>{message}</p>}

            <Button type="submit" disabled={loading}>
              {isRegister ? "Зареєструватися" : "Увійти"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon="account_circle"
              onClick={signInWithGoogle}
            >
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
