import { useEffect, useState } from "react";
import { coursesApi, moodleProxyApi, materialsApi } from "../../lib/api.js";
import { supabase } from "../../lib/supabase.js";

function TaskCard({ task, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (!task.id) return;
    setCompleting(true);
    await onComplete(task.id);
    setCompleting(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 space-y-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] px-2 py-0.5 rounded font-medium shrink-0 ${task.urgent ? "bg-red-100 text-red-700" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
            {task.label}
          </span>
          <span className="material-symbols-outlined text-gray-400 text-[16px] shrink-0">
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </div>
        <div className="text-[14px] font-medium">{task.title}</div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 space-y-3 pt-3">
          {task.description ? (
            <p className="text-[13px] text-gray-500 whitespace-pre-wrap leading-relaxed">{task.description}</p>
          ) : (
            <p className="text-[13px] text-gray-400 italic">Опис відсутній</p>
          )}
          {task.id && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-[12px] font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
              {completing ? "Збереження..." : "Позначити виконаним"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const courses = [
  {
    id: "math",
    code: "MATH-401",
    name: "Вивища математика",
    teacher: "проф. Коваленко О. М.",
    color: "bg-yellow-400",
    glow: "bg-yellow-400/5 group-hover:bg-yellow-400/10",
    hoverText: "group-hover:text-yellow-500",
    tasks: 3,
    materials: 12,
    status: "Moodle активний",
    deadlines: [
      { label: "Завтра, 23:59", urgent: true, title: "РГР №2: Диференціальні рівняння", points: 15, progress: 75 },
      { label: "Через 5 днів", urgent: false, title: "Онлайн-тест модуль 2", points: 10, progress: null },
    ],
    files: [
      { icon: "description", color: "text-yellow-400", title: "Лекція 7: Кратні інтеграли", meta: "Додано вчора • PDF, 2.4 МБ", action: "Завантажити" },
      { icon: "code", color: "text-yellow-400", title: "Практична робота №4 (Методичка)", meta: "3 дні тому • DOCX", action: "Завантажити" },
      { icon: "info", color: "text-gray-400", title: "Силабус дисципліни 2023/2024", meta: "Оновлено на початку семестру", action: "Переглянути" },
    ],
  },
  {
    id: "algorithms",
    code: "CS-302",
    name: "Алгоритми та структури",
    teacher: "доц. Шевченко І. В.",
    color: "bg-orange-400",
    glow: "bg-orange-400/5 group-hover:bg-orange-400/10",
    hoverText: "group-hover:text-orange-400",
    tasks: 5,
    materials: 18,
    status: "Moodle активний",
    deadlines: [
      { label: "Через 2 дні", urgent: true, title: "Лабораторна №3: Дерева пошуку", points: 20, progress: 40 },
    ],
    files: [
      { icon: "description", color: "text-orange-400", title: "Лекція 5: Бінарні дерева", meta: "2 дні тому • PDF", action: "Завантажити" },
    ],
  },
  {
    id: "databases",
    code: "DB-204",
    name: "Бази даних",
    teacher: "ст. викл. Мельник П. С.",
    color: "bg-amber-700",
    glow: "bg-amber-700/5 group-hover:bg-amber-700/10",
    hoverText: "group-hover:text-amber-700",
    tasks: 2,
    materials: 9,
    status: "Синхронізовано",
    deadlines: [
      { label: "Сьогодні, 23:59", urgent: true, title: "Реалізація міграцій БД", points: 15, progress: 90 },
    ],
    files: [
      { icon: "description", color: "text-amber-700", title: "Лекція 6: Нормалізація", meta: "Вчора • PDF", action: "Завантажити" },
    ],
  },
  {
    id: "architecture",
    code: "ARCH-405",
    name: "Архітектура ПЗ",
    teacher: "проф. Бондаренко Т. В.",
    color: "bg-gray-400",
    glow: "bg-gray-400/5 group-hover:bg-gray-400/10",
    hoverText: "group-hover:text-gray-500",
    tasks: 1,
    materials: 14,
    status: "Синхронізовано",
    deadlines: [
      { label: "Наступний понеділок", urgent: false, title: "Есе: Мікросервіси vs Моноліт", points: 10, progress: null },
    ],
    files: [
      { icon: "description", color: "text-gray-400", title: "Лекція 4: Патерни проєктування", meta: "Тиждень тому • PDF", action: "Завантажити" },
    ],
  },
];

export default function CourseList({ user, onSidebarRefresh }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [liveCourses, setLiveCourses] = useState(() => (supabase ? [] : courses));
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncError, setSyncError] = useState("");
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [moodleModal, setMoodleModal] = useState(false);
  const [moodleUrl, setMoodleUrl] = useState("https://moodle.uzhnu.edu.ua");
  const [moodleSession, setMoodleSession] = useState("");
  const [sesskey, setSesskey] = useState("");

  useEffect(() => {
    if (!supabase || !user?.id) return;
    supabase.from("courses").select("*, tasks(*)").eq("user_id", user.id).order("name")
      .then(({ data, error }) => {
        if (error) setSyncError(error.message);
        else setLiveCourses(data || []);
      });
  }, [user?.id]);

  const filtered = liveCourses.filter(c =>
    c.name?.toLowerCase().includes(filter.toLowerCase()) ||
    c.code?.toLowerCase().includes(filter.toLowerCase())
  );

  const course = liveCourses.find(c => c.id === selected);

  useEffect(() => {
    if (!selected || !supabase) {
      setCourseMaterials([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    materialsApi.listByCourse(selected).then(({ data }) => setCourseMaterials(data || []));
  }, [selected]);
  const courseFiles = course?.files || [];
  const courseDeadlines = course?.deadlines || (course?.tasks || [])
    .filter((task) => !task.completed_at)
    .map((task) => ({
      id: task.id,
      label: task.due_at ? new Date(task.due_at).toLocaleString("uk-UA") : "Без дедлайну",
      urgent: task.due_at ? new Date(task.due_at) < new Date() : false,
      title: task.title,
      description: task.description,
      points: null,
      progress: null,
    }));

  const handleCompleteTask = async (taskId) => {
    if (!supabase) return;
    const { error } = await supabase.from("tasks").update({ completed_at: new Date().toISOString() }).eq("id", taskId);
    if (error) { setSyncError(error.message); return; }
    // Оновлюємо локальний стан курсів
    setLiveCourses((prev) => prev.map((c) => ({
      ...c,
      tasks: (c.tasks || []).map((t) => t.id === taskId ? { ...t, completed_at: new Date().toISOString() } : t),
    })));
  };

  const handleDeleteCourse = async (courseToDelete) => {
    if (!window.confirm(`Видалити курс «${courseToDelete.name}»?`)) return;

    if (supabase) {
      const { error } = await coursesApi.remove(courseToDelete.id);
      if (error) {
        setSyncError(`Не вдалося видалити курс: ${error.message}`);
        return;
      }
    }

    setLiveCourses((items) => items.filter((item) => item.id !== courseToDelete.id));
    setSelected(null);
  };

  // Синхронізує матеріали і завдання для всіх Moodle курсів
  const syncAllCoursesContent = async (moodleUrlVal, moodleSessionVal, sesskeyVal, coursesList) => {
    const moodleCourses = coursesList.filter(c => c.source === "moodle" && c.external_id);
    for (const c of moodleCourses) {
      await moodleProxyApi.syncCourseContent(
        moodleUrlVal, moodleSessionVal, sesskeyVal, c.external_id
      );
    }
  };

  const connectMoodle = async () => {
    setSyncStatus("syncing");
    setSyncError("");
    const { data, error } = await moodleProxyApi.connect(
      moodleUrl.trim(),
      moodleSession.trim(),
      sesskey.trim()
    );

    if (error) {
      let msg = error.message ?? "Помилка з'єднання";
      try {
        const body = await error.context?.json?.();
        if (body?.error) msg = body.error;
      } catch { /* ігноруємо */ }
      setSyncError(msg);
      setSyncStatus("error");
      return;
    }

    if (data?.error) {
      setSyncError(data.error);
      setSyncStatus("error");
      return;
    }

    // Завантажуємо оновлені курси
    const { data: refreshedCourses } = await supabase
      .from("courses").select("*, tasks(*)")
      .eq("user_id", user.id).order("name");
    const coursesList = refreshedCourses || [];
    setLiveCourses(coursesList);

    // Синхронізуємо контент кожного Moodle курсу
    const { data: conn } = await supabase
      .from("moodle_connections")
      .select("moodle_session, sesskey, base_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (conn?.moodle_session && conn?.sesskey) {
      await syncAllCoursesContent(conn.base_url, conn.moodle_session, conn.sesskey, coursesList);
      // Перезавантажуємо курси з матеріалами
      const { data: final } = await supabase
        .from("courses").select("*, tasks(*)")
        .eq("user_id", user.id).order("name");
      setLiveCourses(final || []);
    }

    setSyncStatus("done");
    setMoodleSession("");
    setSesskey("");
    setMoodleModal(false);
    onSidebarRefresh?.();
  };

  // Ручна синхронізація одного курсу
  const handleSyncCourse = async (c) => {
    if (!c.external_id) return;
    setSyncError("");
    const { data: conn } = await supabase
      .from("moodle_connections")
      .select("moodle_session, sesskey, base_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conn?.moodle_session) {
      setSyncError("Moodle не підключено. Підключіть спочатку.");
      return;
    }

    const { data, error } = await moodleProxyApi.syncCourseContent(
      conn.base_url, conn.moodle_session, conn.sesskey, c.external_id
    );

    if (error || data?.error) {
      setSyncError(error?.message || data?.error || "Помилка синхронізації");
      return;
    }

    // Перезавантажуємо курси
    const { data: refreshed } = await supabase
      .from("courses").select("*, tasks(*)")
      .eq("user_id", user.id).order("name");
    setLiveCourses(refreshed || []);
  };

  return (
    <div className="flex flex-col w-full p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>folder</span>
            Усі дисципліни / Семестр IV
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight">Мої курси</h1>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400" style={{ fontSize: 18 }}>search</span>
            <input
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-[14px] placeholder:text-gray-400 outline-none focus:border-gray-400 transition-colors"
              placeholder="Фільтрувати курси..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button
            onClick={() => setMoodleModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-medium hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>link</span>
            Підключити Moodle
          </button>
        </div>
      </div>

      {/* Course Grid or Detail */}
      {!selected ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {syncError && <div className="md:col-span-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">{syncError}</div>}
          {!filtered.length && <div className="md:col-span-2 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">Курсів ще немає. Підключіть Moodle, щоб завантажити актуальні курси.</div>}
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c.id)}
              className="group cursor-pointer bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-gray-400 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-all ${c.glow}`} />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${c.color}`} />
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider">{c.code}</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{c.source === "moodle" ? "Moodle" : c.source === "google_classroom" ? "Google Classroom" : "Ручний курс"}</span>
                </div>
                <h3 className={`text-[20px] font-semibold mb-2 transition-colors ${c.hoverText}`}>{c.name}</h3>
                <p className="text-[13px] text-gray-500 mb-4">{c.teacher ? `Викладач: ${c.teacher}` : c.source === "moodle" ? "Дані завантажені з Moodle" : c.source === "google_classroom" ? "Дані завантажені з Google Classroom" : "Створено вручну"}</p>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[13px] text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>assignment</span>
                    {c.tasks?.length ?? c.task_count ?? 0} завдань
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>description</span>
                    {c.materials ?? 0} матеріалів
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={(event) => { event.stopPropagation(); handleDeleteCourse(c); }} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                    Видалити
                  </button>
                  <span className="material-symbols-outlined text-gray-400 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Detail View */
        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 border border-gray-200 dark:border-gray-800 space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${course.color}`} />
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider">{course.code}</span>
                </div>
                <h2 className="text-[28px] font-semibold">{course.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => handleDeleteCourse(course)} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50">Видалити курс</button>
              <button type="button" onClick={() => handleSyncCourse(course)} className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
                Оновити з Moodle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Materials */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-[16px] font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>menu_book</span>
                Матеріали курсу
              </h3>
              {course.source === "moodle" && course.external_id ? (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-6 flex flex-col items-center gap-4 text-center">
                  <span className="material-symbols-outlined text-gray-300 dark:text-gray-600" style={{ fontSize: 48 }}>school</span>
                  <div>
                    <p className="text-[14px] font-medium text-gray-700 dark:text-gray-300">Матеріали доступні в Moodle</p>
                    <p className="text-[12px] text-gray-400 mt-1">Університет не надає доступ до файлів через API — відкрий курс напряму</p>
                  </div>
                  <a
                    href={`https://moodle.uzhnu.edu.ua/course/view.php?id=${course.external_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-medium hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                    Відкрити курс в Moodle
                  </a>
                </div>
              ) : course.source === "google_classroom" ? (
                courseMaterials.length ? (
                  <div className="space-y-2">
                    {courseMaterials.map((mat) => (
                      <div key={mat.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="material-symbols-outlined text-blue-400 mt-0.5 shrink-0" style={{ fontSize: 18 }}>description</span>
                          <div className="min-w-0">
                            <div className="text-[14px] font-medium truncate">{mat.title}</div>
                            {mat.description && <div className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{mat.description}</div>}
                          </div>
                        </div>
                        {mat.url && (
                          <a href={mat.url} target="_blank" rel="noreferrer" className="shrink-0 flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                            Відкрити
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Матеріалів ще немає. Зробіть синхронізацію Google Classroom.</p>
                )
              ) : (
                <div className="space-y-2">
                  {courseFiles.length ? courseFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${f.color}`}>{f.icon}</span>
                        <div>
                          <div className="text-[14px] font-medium">{f.title}</div>
                          <div className="text-[11px] text-gray-500">{f.meta}</div>
                        </div>
                      </div>
                      <button className="text-[12px] font-medium hover:underline">{f.action}</button>
                    </div>
                  )) : <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Матеріалів ще немає.</p>}
                </div>
              )}
            </div>

            {/* Deadlines */}
            <div className="space-y-4">
              <h3 className="text-[16px] font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 18 }}>event</span>
                Дедлайни по курсу
              </h3>
              <div className="space-y-3">
                {courseDeadlines.length ? courseDeadlines.map((d) => (
                  <TaskCard key={d.id ?? d.title} task={d} onComplete={handleCompleteTask} />
                )) : <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Активних завдань немає.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Moodle Modal */}
      {moodleModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setMoodleModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white dark:text-gray-900" style={{ fontSize: 20 }}>school</span>
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold leading-tight">Підключення Moodle</h3>
                  <p className="text-[12px] text-gray-400 mt-0.5">moodle.uzhnu.edu.ua</p>
                </div>
              </div>
              <button onClick={() => setMoodleModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {/* Інструкція */}
            <div className="px-6 py-4 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40">
              <p className="text-[12px] font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                Як отримати дані (займе ~1 хвилину)
              </p>
              <ol className="space-y-2.5">
                <li className="flex gap-2.5 text-[12px] text-blue-800 dark:text-blue-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                  <span>Відкрий <a href="https://moodle.uzhnu.edu.ua" target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">moodle.uzhnu.edu.ua</a> і залогінься через Google</span>
                </li>
                <li className="flex gap-2.5 text-[12px] text-blue-800 dark:text-blue-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                  <div>
                    <span>Натисни </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-[11px] font-mono">F12</kbd>
                    <span> → вкладка </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-[11px] font-mono">Application</kbd>
                    <span> → </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-[11px] font-mono">Cookies</kbd>
                    <span> → знайди </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-[11px] font-mono">MoodleSession</kbd>
                    <span> → скопіюй значення</span>
                  </div>
                </li>
                <li className="flex gap-2.5 text-[12px] text-blue-800 dark:text-blue-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                  <div>
                    <span>Вкладка </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-[11px] font-mono">Console</kbd>
                    <span> → введи команду та скопіюй результат:</span>
                    <div className="mt-1.5 px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900/60 rounded-lg font-mono text-[11px] text-blue-900 dark:text-blue-200 select-all">
                      window.M.cfg.sesskey
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            {/* Поля */}
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">URL Moodle</label>
                <input
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] outline-none focus:border-gray-400 transition-colors"
                  placeholder="https://moodle.uzhnu.edu.ua"
                  value={moodleUrl}
                  onChange={e => setMoodleUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                  MoodleSession
                  <span className="ml-2 normal-case text-gray-400 font-normal">(крок 2)</span>
                </label>
                <input
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] outline-none focus:border-gray-400 font-mono transition-colors"
                  placeholder="iqcst2rm71682ae1p1agm58m5v"
                  value={moodleSession}
                  onChange={e => setMoodleSession(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                  Sesskey
                  <span className="ml-2 normal-case text-gray-400 font-normal">(крок 3)</span>
                </label>
                <input
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] outline-none focus:border-gray-400 font-mono transition-colors"
                  placeholder="D4rPf4zteb"
                  value={sesskey}
                  onChange={e => setSesskey(e.target.value)}
                />
              </div>
            </div>

            {/* Помилка */}
            {syncStatus === "error" && syncError && (
              <div className="mx-6 mb-3 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl flex items-start gap-2">
                <span className="material-symbols-outlined text-red-500 flex-shrink-0 mt-0.5" style={{ fontSize: 15 }}>error</span>
                <p className="text-[12px] text-red-700 dark:text-red-400">{syncError}</p>
              </div>
            )}

            {/* Підвал */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>lock</span>
                Дані зашифровані та зберігаються тільки для тебе
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setMoodleModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-[12px] font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Скасувати
                </button>
                <button
                  onClick={connectMoodle}
                  disabled={syncStatus === "syncing" || !moodleUrl || !moodleSession || !sesskey}
                  className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
                >
                  {syncStatus === "syncing" ? (
                    <>
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span>
                      Перевірка...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>
                      З'єднати
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
