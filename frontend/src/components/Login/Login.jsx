import { useState } from "react";
import { authApi } from "../../lib/api.js";
import { supabaseConfigured } from "../../lib/supabase.js";
import styles from "./Login.module.css";

export default function Login({ onLogin }) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabaseConfigured) {
      setError("Supabase ще не налаштований. Додайте VITE_SUPABASE_URL і VITE_SUPABASE_ANON_KEY у .env.");
      return;
    }

    if (view === "forgot") {
      if (!email.trim()) { setError("Введіть email, щоб отримати посилання для відновлення."); return; }
      setIsSubmitting(true);
      const { error: resetError } = await authApi.resetPassword(email.trim());
      setIsSubmitting(false);
      if (resetError) { setError(resetError.message); return; }
      setMessage("Якщо акаунт існує, посилання для відновлення вже надіслано.");
      return;
    }

    if (!email.trim() || !password.trim() || (view === "register" && (!name.trim() || !confirmPassword.trim()))) {
      setError(view === "register" ? "Заповніть усі поля, щоб створити акаунт." : "Введіть email і пароль, щоб продовжити.");
      return;
    }

    if (view === "register" && password !== confirmPassword) {
      setError("Паролі не збігаються.");
      return;
    }

    if (view === "register") {
      setIsSubmitting(true);
      const { data, error: signUpError } = await authApi.signUp(email.trim(), password, name.trim());
      setIsSubmitting(false);
      if (signUpError) { setError(signUpError.message); return; }
      setMessage(data.session ? "Акаунт створено." : "Акаунт створено. Перевірте email для підтвердження.");
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await authApi.signIn(email.trim(), password);
    setIsSubmitting(false);
    if (signInError) { setError(signInError.message); return; }
    onLogin();
  };

  const changeView = (nextView) => { setView(nextView); setError(""); setMessage(""); };

  const handleGoogleLogin = async () => {
    setError("");
    if (!supabaseConfigured) { setError("Supabase ще не налаштований. Додайте змінні середовища у .env."); return; }
    const { error: googleError } = await authApi.signInWithGoogle();
    if (googleError) setError(googleError.message);
  };

  const titles = { login: "Увійти в акаунт", register: "Створити акаунт", forgot: "Відновити пароль" };
  const subtitles = {
    login: "Продовжуй планувати навчання без зайвого шуму.",
    register: "Створи акаунт, щоб зберігати свій навчальний ритм.",
    forgot: "Введи email, і ми надішлемо інструкції для відновлення.",
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.side}>
          <div>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>
                <span className="material-symbols-outlined">school</span>
              </span>
              <span>StudyTrack</span>
            </div>
            <h1>Повернись до своїх цілей.</h1>
          </div>
          <div className={styles.sideFooter}>
            <span className={styles.dot} />
            Усі дедлайни, курси й досягнення в одному місці
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.heading}>
            <h2>{titles[view]}</h2>
            <p>{subtitles[view]}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {view === "register" && (
              <div className={styles.field}>
                <label htmlFor="name">Ім'я</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Олександр Мельник" autoComplete="name" />
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@university.edu" autoComplete="email" />
            </div>

            {view !== "forgot" && (
              <div className={styles.field}>
                <label htmlFor="password">Пароль</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введіть пароль" autoComplete="current-password" />
              </div>
            )}

            {view === "register" && (
              <div className={styles.field}>
                <label htmlFor="confirmPassword">Підтвердіть пароль</label>
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Повторіть пароль" autoComplete="new-password" />
              </div>
            )}

            {view === "login" && (
              <div className={styles.forgotRow}>
                <button type="button" className={styles.forgotBtn} onClick={() => changeView("forgot")}>Забули пароль?</button>
              </div>
            )}

            {error && <p className={styles.error} role="alert">{error}</p>}
            {message && <p className={styles.success} role="status">{message}</p>}

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {view === "register" ? "Зареєструватися" : view === "forgot" ? "Надіслати посилання" : "Увійти"}
            </button>
          </form>

          {view !== "forgot" && (
            <>
              <div className={styles.divider}>або</div>
              <button type="button" className={styles.googleBtn} onClick={handleGoogleLogin}>
                <span>G</span> Увійти через Google
              </button>
            </>
          )}

          <p className={styles.switchRow}>
            {view === "forgot" ? "Згадали пароль?" : view === "register" ? "Вже маєте акаунт?" : "Ще немає акаунта?"}{" "}
            <button type="button" className={styles.switchBtn} onClick={() => changeView(view === "login" ? "register" : "login")}>
              {view === "login" ? "Зареєструватися" : "Увійти"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
