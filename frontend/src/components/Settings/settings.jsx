import { useEffect, useState } from "react";
import { moodleProxyApi, classroomApi, userSettingsApi } from "../../lib/api.js";
import { supabase } from "../../lib/supabase.js";

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-gray-900 dark:peer-checked:bg-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-900 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
    </label>
  );
}

function SettingRow({ icon, iconColor = "text-gray-600", title, subtitle, border = true, children }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${border ? "border-b border-gray-100 dark:border-gray-800" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: 18 }}>{icon}</span>
        </div>
        <div>
          <div className="text-[14px] font-medium">{title}</div>
          {subtitle && <div className="text-[13px] text-gray-500">{subtitle}</div>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function Settings({ user, onNavigate }) {
  const [streaksEnabled, setStreaksEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifHour, setNotifHour] = useState(20);
  const [notifPermission, setNotifPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem("studytrack-compact") === "true");
  const [theme, setTheme] = useState(() => localStorage.getItem("studytrack-theme") || "system");
  const [syncInterval, setSyncInterval] = useState("30");
  const [nextSyncAt, setNextSyncAt] = useState(null); // Date | null
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | done
  const [cacheCleared, setCacheCleared] = useState(false);
  const [moodleConnected, setMoodleConnected] = useState(false);
  const [moodleLastSynced, setMoodleLastSynced] = useState(null);
  const [moodleError, setMoodleError] = useState("");

  const [classroomConnected, setClassroomConnected] = useState(
    () => Boolean(localStorage.getItem("google_provider_token"))
  );
  const [classroomSyncStatus, setClassroomSyncStatus] = useState("idle"); // idle | syncing | done | error
  const [classroomError, setClassroomError] = useState("");
  const [classroomLastSynced, setClassroomLastSynced] = useState(null);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Користувач";
  const displayEmail = user?.email || "email@domain.com";
  const initials = displayName.split(" ").slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "К";

  useEffect(() => {
    if (!supabase || !user?.id) return;
    supabase.from("moodle_connections").select("last_synced_at").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) setMoodleError(error.message);
        setMoodleConnected(Boolean(data));
        setMoodleLastSynced(data?.last_synced_at || null);
      });
  }, [user?.id]);

  // ── Завантаження налаштувань гейміфікації з БД ─────────────────────
  useEffect(() => {
    if (!supabase || !user?.id) return;
    userSettingsApi.get().then(({ data }) => {
      if (!data) return;
      setStreaksEnabled(data.streaks_enabled);
      setNotifEnabled(data.notif_streak_enabled);
      setNotifHour(data.notif_hour);
      const interval = String(data.sync_interval_minutes ?? 30);
      setSyncInterval(interval);
      // Рахуємо коли наступна синхронізація
      if (interval !== "0") {
        const next = new Date(Date.now() + Number(interval) * 60 * 1000);
        setNextSyncAt(next);
      }
    });
  }, [user?.id]);

  // ── Планувальник вечірніх сповіщень ────────────────────────────────
  // Запускаємо один таймер при зміні налаштувань. Він спрацює сьогодні
  // о вибраній годині якщо час ще не минув, або завтра.
  useEffect(() => {
    if (!notifEnabled || notifPermission !== "granted") return;

    const scheduleNext = () => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(notifHour, 0, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1); // вже минуло — завтра
      const delay = target - now;

      const id = setTimeout(() => {
        new Notification("StudyTrack 🔥", {
          body: "Не забудь закрити завдання сьогодні щоб не зламати стрік!",
          icon: "/favicon.svg",
        });
        scheduleNext(); // плануємо наступне на завтра
      }, delay);

      return id;
    };

    const timerId = scheduleNext();
    return () => clearTimeout(timerId);
  }, [notifEnabled, notifHour, notifPermission]);

  const handleSync = async () => {
    if (!moodleConnected) {
      onNavigate?.("courses");
      return;
    }
    setSyncStatus("syncing");
    setMoodleError("");

    // Читаємо збережені credentials
    const { data: conn } = await supabase
      .from("moodle_connections")
      .select("moodle_session, sesskey, base_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conn?.moodle_session) {
      setMoodleError("Дані підключення не знайдено. Підключіть Moodle знову.");
      setSyncStatus("idle");
      return;
    }

    // Отримуємо список курсів юзера
    const { data: courses } = await supabase
      .from("courses")
      .select("id, external_id")
      .eq("user_id", user.id)
      .eq("source", "moodle");

    // Синхронізуємо кожен курс
    for (const course of (courses ?? [])) {
      if (!course.external_id) continue;
      const { data, error } = await moodleProxyApi.syncCourseContent(
        conn.base_url, conn.moodle_session, conn.sesskey, course.external_id
      );
      if (error || data?.error) {
        const msg = error?.message || data?.error || "Помилка синхронізації";
        setMoodleError(msg);
        setSyncStatus("idle");
        return;
      }
    }

    setMoodleLastSynced(new Date().toISOString());
    setSyncStatus("done");
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleClassroomSync = async () => {
    const token = localStorage.getItem("google_provider_token");
    if (!token) {
      setClassroomError("Увійдіть через Google, щоб підключити Google Classroom.");
      return;
    }
    setClassroomSyncStatus("syncing");
    setClassroomError("");
    const { data, error } = await classroomApi.sync();
    if (error || data?.error) {
      const msg = error?.message || data?.error || "Помилка синхронізації";
      const hint = data?.hint ? ` — ${data.hint}` : "";
      const detail = data?.detail ? ` (${typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)})` : "";
      setClassroomError(`${msg}${hint}${detail}`);
      setClassroomSyncStatus("error");
      return;
    }
    setClassroomLastSynced(new Date().toISOString());
    setClassroomConnected(true);
    setClassroomSyncStatus("done");
    setTimeout(() => window.location.reload(), 1500);
  };

  // ── Зберегти налаштування гейміфікації в БД ───────────────────────
  const saveGameSettings = async (patch) => {
    if (!supabase || !user?.id) return;
    const next = {
      streaks_enabled: streaksEnabled,
      notif_streak_enabled: notifEnabled,
      notif_hour: notifHour,
      ...patch,
    };
    await userSettingsApi.save(user.id, next);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  // ── Запит дозволу на сповіщення браузера ──────────────────────────
  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") {
      new Notification("StudyTrack ✅", {
        body: "Сповіщення увімкнено! Ти отримуватимеш нагадування про стрік.",
        icon: "/favicon.svg",
      });
    }
  };

  const handleTheme = (t) => {
    setTheme(t);
    localStorage.setItem("studytrack-theme", t);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = t === "dark" || (t === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-8 py-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight mb-1">Налаштування</h1>
        <p className="text-[14px] text-gray-500">Керування параметрами застосунку та синхронізацією.</p>
      </div>

      <div className="space-y-8">

        {/* Section 1: Акаунт і Moodle */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500 px-4 mb-2">Обліковий запис та інтеграції</div>
          <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-600" style={{ fontSize: 18 }}>school</span>
                </div>
                <div>
                  <div className="text-[14px] font-medium">Moodle університету</div>
                  <div className="text-[13px] text-gray-500 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${moodleConnected ? "bg-yellow-400" : "bg-gray-400"}`} />
                    {moodleConnected ? `Активно${moodleLastSynced ? ` • ${new Date(moodleLastSynced).toLocaleString("uk-UA")}` : ""}` : "Не підключено"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncStatus === "syncing"}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[12px] transition-colors flex items-center gap-1"
                >
                  <span className={`material-symbols-outlined ${syncStatus === "syncing" ? "animate-spin" : ""}`} style={{ fontSize: 14 }}>
                    {syncStatus === "done" ? "done" : "sync"}
                  </span>
                  {syncStatus === "syncing" ? "Оновлення..." : syncStatus === "done" ? "Готово" : "Оновити"}
                </button>
                <button
                  onClick={() => onNavigate?.("courses")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] transition-colors ${moodleConnected ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  {moodleConnected ? "Керувати" : "Підключити"}
                </button>
              </div>
            </div>
            {moodleError && <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">{moodleError}</p>}
            {/* Google Classroom row */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600" style={{ fontSize: 18 }}>class</span>
                </div>
                <div>
                  <div className="text-[14px] font-medium">Google Classroom</div>
                  <div className="text-[13px] text-gray-500 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${classroomConnected ? "bg-green-400" : "bg-gray-400"}`} />
                    {classroomConnected
                      ? `Активно${classroomLastSynced ? ` • ${new Date(classroomLastSynced).toLocaleString("uk-UA")}` : ""}`
                      : "Потрібен вхід через Google"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClassroomSync}
                  disabled={classroomSyncStatus === "syncing"}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[12px] transition-colors flex items-center gap-1"
                >
                  <span className={`material-symbols-outlined ${classroomSyncStatus === "syncing" ? "animate-spin" : ""}`} style={{ fontSize: 14 }}>
                    {classroomSyncStatus === "done" ? "done" : "sync"}
                  </span>
                  {classroomSyncStatus === "syncing" ? "Синхронізація..." : classroomSyncStatus === "done" ? "Готово" : "Синхронізувати"}
                </button>
              </div>
            </div>
            {classroomError && <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">{classroomError}</p>}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Аватар користувача" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[12px] font-medium text-white dark:bg-white dark:text-gray-900">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="break-words text-[14px] font-medium">{displayName}</div>
                  <div className="break-all text-[13px] text-gray-500">{displayEmail}</div>
                </div>
              </div>
              <span className="text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{user?.role === "admin" ? "Адміністратор" : "Студент"}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Гейміфікація */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 mb-2 flex items-center justify-between">
            <span>Гейміфікація та мотивація</span>
            {settingsSaved && (
              <span className="text-[11px] text-green-500 flex items-center gap-1 normal-case font-normal tracking-normal">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                Збережено
              </span>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">

            {/* Стріки */}
            <SettingRow
              icon="local_fire_department"
              iconColor="text-orange-400"
              title="Стріки та бейджі"
              subtitle="Показувати вогник стріка та зароблені досягнення"
            >
              <Toggle
                checked={streaksEnabled}
                onChange={async e => {
                  const val = e.target.checked;
                  setStreaksEnabled(val);
                  await saveGameSettings({ streaks_enabled: val });
                }}
              />
            </SettingRow>

            {/* Сповіщення про стрік */}
            <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: 18 }}>notifications_active</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-medium">Сповіщення про стрік</div>
                    <div className="text-[13px] text-gray-500 dark:text-gray-400">
                      Нагадування ввечері, якщо завдання не закриті
                    </div>
                  </div>
                </div>
                <Toggle
                  checked={notifEnabled}
                  onChange={async e => {
                    const val = e.target.checked;
                    if (val && notifPermission !== "granted") {
                      await requestNotifPermission();
                      // після запиту перевіряємо ще раз
                      if (Notification.permission !== "granted") return;
                    }
                    setNotifEnabled(val);
                    await saveGameSettings({ notif_streak_enabled: val });
                  }}
                />
              </div>

              {/* Підрядок: дозвіл + вибір години */}
              {notifEnabled && (
                <div className="mt-3 ml-11 flex items-center gap-3 flex-wrap">
                  {notifPermission !== "granted" ? (
                    <button
                      type="button"
                      onClick={requestNotifPermission}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-[12px] font-medium hover:bg-yellow-100 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>notifications</span>
                      {notifPermission === "denied"
                        ? "Заблоковано браузером — дозволь у налаштуваннях"
                        : "Дозволити сповіщення"}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[12px] text-green-600">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                      Дозвіл отримано
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-500">Час нагадування:</span>
                    <select
                      value={notifHour}
                      onChange={async e => {
                        const val = Number(e.target.value);
                        setNotifHour(val);
                        await saveGameSettings({ notif_hour: val });
                      }}
                      className="bg-gray-100 dark:bg-gray-800 text-[12px] px-2 py-1 rounded-lg outline-none cursor-pointer"
                    >
                      {[17, 18, 19, 20, 21, 22].map(h => (
                        <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Section 3: Вигляд */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 mb-2">Зовнішній вигляд</div>
          <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
            {/* Theme picker */}
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400" style={{ fontSize: 18 }}>palette</span>
                </div>
                <div>
                  <div className="text-[14px] font-medium">Тема оформлення</div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">
                    {theme === "light" ? "Світла тема активна" : theme === "dark" ? "Темна тема активна" : "Тема відповідає системі"}
                  </div>
                </div>
              </div>

              {/* Theme preview cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* Light */}
                <button
                  type="button"
                  onClick={() => handleTheme("light")}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                    theme === "light"
                      ? "border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {/* Preview miniature — light */}
                  <div className="bg-[#f5f5f7] p-2 h-20">
                    <div className="flex gap-1 h-full">
                      <div className="w-8 bg-white rounded-md flex flex-col gap-1 p-1">
                        <div className="h-1.5 bg-gray-200 rounded-full w-full" />
                        <div className="h-1 bg-gray-100 rounded-full w-3/4" />
                        <div className="h-1 bg-gray-100 rounded-full w-3/4" />
                        <div className="h-1 bg-gray-100 rounded-full w-3/4" />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="bg-white rounded-md h-6 flex items-center px-1.5 gap-1">
                          <div className="h-1.5 bg-gray-800 rounded-full w-1/2" />
                        </div>
                        <div className="bg-white rounded-md flex-1 p-1 flex flex-col gap-0.5">
                          <div className="h-1 bg-blue-200 rounded-full w-3/4" />
                          <div className="h-1 bg-gray-100 rounded-full w-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="py-2 text-center text-[12px] font-medium bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                    Світла
                  </div>
                  {theme === "light" && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 11 }}>check</span>
                    </div>
                  )}
                </button>

                {/* Dark */}
                <button
                  type="button"
                  onClick={() => handleTheme("dark")}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                    theme === "dark"
                      ? "border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {/* Preview miniature — dark */}
                  <div className="bg-[#0f0f10] p-2 h-20">
                    <div className="flex gap-1 h-full">
                      <div className="w-8 bg-[#1c1c1e] rounded-md flex flex-col gap-1 p-1">
                        <div className="h-1.5 bg-[#38383a] rounded-full w-full" />
                        <div className="h-1 bg-[#2c2c2e] rounded-full w-3/4" />
                        <div className="h-1 bg-[#2c2c2e] rounded-full w-3/4" />
                        <div className="h-1 bg-[#2c2c2e] rounded-full w-3/4" />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="bg-[#1c1c1e] rounded-md h-6 flex items-center px-1.5 gap-1">
                          <div className="h-1.5 bg-[#f5f5f7] rounded-full w-1/2" />
                        </div>
                        <div className="bg-[#1c1c1e] rounded-md flex-1 p-1 flex flex-col gap-0.5">
                          <div className="h-1 bg-blue-700 rounded-full w-3/4" />
                          <div className="h-1 bg-[#38383a] rounded-full w-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="py-2 text-center text-[12px] font-medium bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                    Темна
                  </div>
                  {theme === "dark" && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 11 }}>check</span>
                    </div>
                  )}
                </button>

                {/* System */}
                <button
                  type="button"
                  onClick={() => handleTheme("system")}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                    theme === "system"
                      ? "border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {/* Preview miniature — split light/dark */}
                  <div className="h-20 relative overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 bg-[#f5f5f7] p-1.5 flex flex-col gap-1">
                        <div className="h-1.5 bg-white rounded-full w-full" />
                        <div className="h-1 bg-gray-200 rounded-full w-3/4" />
                        <div className="h-1 bg-gray-200 rounded-full w-1/2" />
                        <div className="h-3 bg-white rounded mt-0.5" />
                      </div>
                      <div className="w-1/2 bg-[#0f0f10] p-1.5 flex flex-col gap-1">
                        <div className="h-1.5 bg-[#38383a] rounded-full w-full" />
                        <div className="h-1 bg-[#2c2c2e] rounded-full w-3/4" />
                        <div className="h-1 bg-[#2c2c2e] rounded-full w-1/2" />
                        <div className="h-3 bg-[#1c1c1e] rounded mt-0.5" />
                      </div>
                    </div>
                    {/* Divider line */}
                    <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400/40" />
                  </div>
                  <div className="py-2 text-center text-[12px] font-medium bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                    Системна
                  </div>
                  {theme === "system" && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white" style={{ fontSize: 11 }}>check</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <SettingRow
              icon="view_headline"
              title="Компактний режим списків"
              subtitle="Зменшені відступи у списках завдань"
              border={false}
            >
              <Toggle
                checked={compactMode}
                onChange={e => {
                  const val = e.target.checked;
                  setCompactMode(val);
                  localStorage.setItem("studytrack-compact", String(val));
                  document.documentElement.classList.toggle("compact", val);
                }}
              />
            </SettingRow>
          </div>
        </div>

        {/* Section 4: Дані */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 mb-2">Дані та синхронізація</div>
          <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400" style={{ fontSize: 18 }}>update</span>
                </div>
                <div>
                  <div className="text-[14px] font-medium">Автоматична синхронізація</div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">
                    {syncInterval === "0"
                      ? "Тільки вручну"
                      : nextSyncAt
                        ? `Наступна о ${nextSyncAt.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}`
                        : "Moodle + Google Classroom"}
                  </div>
                </div>
              </div>
              <select
                value={syncInterval}
                onChange={async e => {
                  const val = e.target.value;
                  setSyncInterval(val);
                  // Оновлюємо індикатор
                  if (val === "0") {
                    setNextSyncAt(null);
                  } else {
                    setNextSyncAt(new Date(Date.now() + Number(val) * 60 * 1000));
                  }
                  // Зберігаємо в БД
                  if (supabase && user?.id) {
                    await userSettingsApi.save(user.id, { sync_interval_minutes: Number(val) });
                  }
                }}
                className="bg-gray-100 dark:bg-gray-800 border-none text-[12px] px-3 py-1.5 rounded-lg outline-none cursor-pointer"
              >
                <option value="15">Кожні 15 хв</option>
                <option value="30">Кожні 30 хв</option>
                <option value="60">Щогодини</option>
                <option value="0">Вручну</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400" style={{ fontSize: 18 }}>database</span>
                </div>
                <div>
                  <div className="text-[14px] font-medium">Кеш матеріалів та завдань</div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">
                    {cacheCleared ? "Кеш очищено (0 МБ)" : "Звільнити місце на пристрої (зайнято 42 МБ)"}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClearCache}
                disabled={cacheCleared}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[12px] transition-colors disabled:opacity-50"
              >
                {cacheCleared ? "Очищено" : "Очистити кеш"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-[13px] text-gray-400">
        StudyTrack Notebook v2.4 • Усі дані зберігаються локально
      </div>
    </div>
  );
}
