import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "../Status/Status.module.css";

/** Сторінка, на яку Supabase повертає користувача після входу через Google. */
export default function AuthCallback() {
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    completeOAuth(window.location.hash)
      .then(() => {
        // прибираємо токени з адресного рядка
        window.history.replaceState(null, "", "/auth/callback");
        navigate("/tasks", { replace: true });
      })
      .catch((err) => setError(err));
  }, [completeOAuth, navigate]);

  if (error)
    return <p className={`${styles.note} ${styles.error}`}>Не вдалося увійти: {error.message}</p>;
  return <p className={styles.note}>Завершуємо вхід…</p>;
}
