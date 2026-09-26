import { useState } from "react";
import { authApi } from "../../lib/api.js";
import { supabaseConfigured } from "../../lib/supabase.js";

export default function Login({ onLogin }) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      if (!email.trim()) {
        setError("Введіть email, щоб отримати посилання для відновлення.");
        return;
      }

      setIsSubmitting(true);
      const { error: resetError } = await authApi.resetPassword(email.trim());
      setIsSubmitting(false);
      if (resetError) {
        setError(resetError.message);
        return;
      }
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
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setMessage(data.session ? "Акаунт створено." : "Акаунт створено. Перевірте email для підтвердження.");
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await authApi.signIn(email.trim(), password);
    setIsSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    onLogin();
  };

  const changeView = (nextView) => {
    setView(nextView);
    setError("");
    setMessage("");
  };

  const handleGoogleLogin = async () => {
    setError("");
    if (!supabaseConfigured) {
      setError("Supabase ще не налаштований. Додайте змінні середовища у .env.");
      return;
    }

    const { error: googleError } = await authApi.signInWithGoogle();
    if (googleError) setError(googleError.message);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] px-5 py-10 text-[#1d1d1f]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-yellow-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_24px_80px_rgba(31,41,55,0.12)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden flex-col justify-between bg-[#14213d] p-10 text-white md:flex lg:p-14">
          <div>
            <div className="mb-16 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-[#14213d]">
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>school</span>
              </span>
              <span className="text-xl font-semibold tracking-tight">StudyTrack</span>
            </div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-yellow-300">Твій навчальний ритм</p>
            <h1 className="max-w-sm text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">Повернись до своїх цілей.</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/65">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            Усі дедлайни, курси й досягнення в одному місці
          </div>
        </div>

        <div className="p-7 sm:p-10 lg:p-14">
          <div className="mb-10 flex items-center gap-3 md:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14213d] text-yellow-400">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>school</span>
            </span>
            <span className="text-xl font-semibold tracking-tight">StudyTrack</span>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#9a9aa0]">Раді тебе бачити</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#14213d]">
              {view === "register" ? "Створити акаунт" : view === "forgot" ? "Відновити пароль" : "Увійти в акаунт"}
            </h2>
            <p className="mt-2 text-sm text-[#6e6e73]">
              {view === "register" ? "Створи акаунт, щоб зберігати свій навчальний ритм." : view === "forgot" ? "Введи email, і ми надішлемо інструкції для відновлення." : "Продовжуй планувати навчання без зайвого шуму."}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {view === "register" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#3f4148]">Ім'я</span>
                <span className="relative block">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9aa0]" style={{ fontSize: 19 }}>person</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Олександр Мельник"
                    autoComplete="name"
                    className="h-12 w-full rounded-xl border border-[#e1e3e8] bg-[#fafbfc] pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#3f4148]">Email</span>
              <span className="relative block">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9aa0]" style={{ fontSize: 19 }}>mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@university.edu"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-[#e1e3e8] bg-[#fafbfc] pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </span>
            </label>

            {view !== "forgot" && <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#3f4148]">Пароль</span>
              <span className="relative block">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9aa0]" style={{ fontSize: 19 }}>lock</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Введіть пароль"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-[#e1e3e8] bg-[#fafbfc] pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9aa0] transition hover:text-[#14213d]"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </span>
            </label>}

            {view === "register" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#3f4148]">Підтвердіть пароль</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Повторіть пароль"
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-[#e1e3e8] bg-[#fafbfc] px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            )}

            {view === "login" && <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[#6e6e73]">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-blue-600" />
                Запам'ятати мене
              </label>
              <button type="button" onClick={() => changeView("forgot")} className="font-medium text-blue-700 hover:text-blue-900">Забули пароль?</button>
            </div>}

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</p>}
            {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" role="status">{message}</p>}

            <button type="submit" disabled={isSubmitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2457e6] text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1946c7] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-70">
              {view === "register" ? "Зареєструватися" : view === "forgot" ? "Надіслати посилання" : "Увійти"}
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{view === "forgot" ? "send" : "arrow_forward"}</span>
            </button>
          </form>

          {view !== "forgot" && <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[#9a9aa0]">
            <span className="h-px flex-1 bg-[#e8e9ed]" />
            або
            <span className="h-px flex-1 bg-[#e8e9ed]" />
          </div>}

          {view !== "forgot" && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dfe1e6] bg-white text-sm font-semibold text-[#3f4148] transition hover:bg-[#f8f9fb] focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <span className="text-base font-bold text-[#4285f4]">G</span>
              Увійти через Google
            </button>
          )}

          <p className="mt-8 text-center text-sm text-[#6e6e73]">
            {view === "forgot" ? "Згадали пароль?" : view === "register" ? "Вже маєте акаунт?" : "Ще немає акаунта?"}{" "}
            <button type="button" onClick={() => changeView(view === "login" ? "register" : "login")} className="font-semibold text-[#14213d] hover:text-blue-700">
              {view === "login" ? "Зареєструватися" : "Увійти"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
