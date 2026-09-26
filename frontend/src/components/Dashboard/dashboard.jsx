import { useEffect, useRef, useState } from "react";
import { coursesApi, tasksApi, userSettingsApi } from "../../lib/api.js";
import { supabase } from "../../lib/supabase.js";
import { calcStreak } from "../../lib/progress.js";

const initialTasks = [
  {
    id: 1,
    title: "Реалізація міграцій БД для інтернет-магазину",
    course: "Бази даних",
    deadline: "Сьогодні, 23:59",
    desc: "Реалізувати реляційну схему для інтернет-магазину за допомогою PostgreSQL та написати міграції.",
    detail: "Створити зв'язки один-до-багатьох та налаштувати індекси для таблиць користувачів та замовлень.",
    group: "today",
    urgency: "yellow",
    meta: "2 файли",
    metaIcon: "attach_file",
  },
  {
    id: 2,
    title: "Есе з мікросервісної архітектури",
    course: "Архітектура ПЗ",
    deadline: "Сьогодні, 18:00",
    desc: "Порівняти монолітну та мікросервісну архітектуру на прикладі реального кейсу Netflix.",
    detail: "Написати короткий аналіз переходу Netflix на мікросервіси та виділити основні проблеми мережевої затримки.",
    group: "today",
    urgency: "yellow",
    meta: "3 сторінки",
    metaIcon: "description",
  },
  {
    id: 3,
    title: "Теорія ймовірностей: варіант 14",
    course: "Вища математика",
    deadline: "Вчора (Прострочено)",
    desc: "Розв'язати задачі з теорії ймовірностей та математичної статистики (варіант 14).",
    detail: "Обчислити математичне сподівання та дисперсію для неперервної випадкової величини.",
    group: "overdue",
    urgency: "red",
    meta: "Прострочено на 1 день",
    metaIcon: "warning",
  },
  {
    id: 4,
    title: "Хеш-таблиці та колізії",
    course: "Алгоритми та структури",
    deadline: "Четвер, 15:00",
    desc: "Реалізувати метод відкрите адресування для вирішення колізій у хеш-таблиці.",
    detail: "Провести бенчмарки для лінійного пробивання та квадратичного пробивання при заповненні 80%.",
    group: "week",
    urgency: "gray",
    meta: "Четвер, 15:00",
    metaIcon: "schedule",
  },
  {
    id: 5,
    title: "Формування команд на проєкт",
    course: "Архітектура ПЗ",
    deadline: "Наступний понеділок",
    desc: "Сформувати команду з 3 осіб та обрати стек технологій для розробки.",
    detail: "Узгодити тему майбутнього додатку з викладачем практичних занять.",
    group: "later",
    urgency: "gray",
    meta: "Наступний понеділок",
    metaIcon: "schedule",
  },
];

function GroupHeader({ color, label, count }) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full inline-block ${color}`} />
        {label}
      </h2>
      <span className="text-[11px] text-gray-400">{count} завдань{count === 1 ? "я" : ""}</span>
    </div>
  );
}

export default function Dashboard({ onOpenTask, user }) {
  const [tasks, setTasks] = useState(() => (supabase ? [] : initialTasks));
  const [taskLoadError, setTaskLoadError] = useState("");
  const [progress, setProgress] = useState({ streak: 0, completedIds: [] });
  const { streak, completedIds } = progress;
  const [modal, setModal] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState(() => localStorage.getItem("studytrack-quick-note") || "");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSources, setActiveSources] = useState([]);
  const [taskFieldErrors, setTaskFieldErrors] = useState({});
  const taskFieldRefs = useRef({});
  const [streaksEnabled, setStreaksEnabled] = useState(true);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    course: "",
    deadline: "",
    desc: "",
    group: "",
    isImportant: false,
  });

  useEffect(() => {
    if (!supabase || !user?.id) return;

    tasksApi.list().then(({ data, error }) => {
      if (error) {
        setTaskLoadError(error.message);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const mapped = (data || []).map((task) => {
        const dueDate = task.due_at ? new Date(task.due_at) : null;
        const daysUntilDue = dueDate ? Math.ceil((dueDate - today) / 86400000) : null;
        const overdue = daysUntilDue !== null && daysUntilDue < 0;
        return {
          id: task.id,
          title: task.title,
          course: task.courses?.name || "Без курсу",
          deadline: dueDate ? dueDate.toLocaleString("uk-UA") : "Без дедлайну",
          desc: task.description || "",
          detail: task.description || "Дані завантажені з Moodle.",
          notes: task.notes || "",
          subtasks: task.subtasks || [],
          isImportant: Boolean(task.is_important),
          source: task.source || "manual",
          completed_at: task.completed_at || null,
          group: overdue ? "overdue" : daysUntilDue !== null && daysUntilDue <= 1 ? "today" : daysUntilDue !== null && daysUntilDue <= 7 ? "week" : "later",
          urgency: overdue ? "red" : daysUntilDue !== null && daysUntilDue <= 1 ? "yellow" : "gray",
          meta: dueDate ? dueDate.toLocaleDateString("uk-UA") : "Без дедлайну",
          metaIcon: "schedule",
        };
      });

      setTasks(mapped);

      // Рахуємо стрік з реальних дат виконання
      const realStreak = calcStreak(data || []);
      const completedIds = (data || []).filter((t) => t.completed_at).map((t) => t.id);
      setProgress((prev) => ({ ...prev, streak: realStreak, completedIds }));
    });
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !user?.id) return;
    userSettingsApi.get().then(({ data }) => {
      if (data) setStreaksEnabled(data.streaks_enabled);
    });
  }, [user?.id]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleTask = async (id) => {
    const isCompleting = !completedIds.includes(id);
    const completedAt = isCompleting ? new Date().toISOString() : null;

    if (supabase) {
      const { error } = await tasksApi.update(id, { completed_at: completedAt });
      if (error) {
        showToast(`Не вдалося оновити завдання: ${error.message}`);
        return;
      }
      setTasks((items) => items.map((item) => item.id === id ? { ...item, completed_at: completedAt } : item));
    }

    setProgress((current) => {
      const newCompletedIds = isCompleting
        ? [...current.completedIds, id]
        : current.completedIds.filter((itemId) => itemId !== id);

      // Рахуємо стрік по реальних датах виконання
      const updatedTasks = tasks.map((t) =>
        t.id === id ? { ...t, completed_at: completedAt } : t
      );
      const newStreak = calcStreak(updatedTasks);

      return { completedIds: newCompletedIds, streak: newStreak };
    });
    if (isCompleting) showToast(`Завдання виконано 🔥`);
  };

  const completeFromModal = () => {
    if (modal && !completedIds.includes(modal.id)) {
      toggleTask(modal.id);
    }
    setModal(null);
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Видалити завдання «${task.title}»?`)) return;

    if (supabase) {
      const { error } = await tasksApi.remove(task.id);
      if (error) {
        showToast(`Не вдалося видалити завдання: ${error.message}`);
        return;
      }
    }

    setTasks((items) => items.filter((item) => item.id !== task.id));
    setProgress((current) => ({
      ...current,
      completedIds: current.completedIds.filter((id) => id !== task.id),
    }));
    showToast("Завдання видалено");
  };

  const handleSaveQuickNote = () => {
    const trimmed = note.trim();
    if (!trimmed) {
      showToast("Спочатку введіть нотатку");
      return;
    }

    localStorage.setItem("studytrack-quick-note", trimmed);
    setSavedNote(trimmed);
    setNote("");
    showToast("Нотатку збережено ✅");
  };

  const handleDeleteNote = () => {
    localStorage.removeItem("studytrack-quick-note");
    setSavedNote("");
    showToast("Нотатку видалено");
  };

  const handleAddTask = async () => {
    const title = taskDraft.title.trim();
    const course = taskDraft.course.trim();
    const deadline = taskDraft.deadline.trim();
    const desc = taskDraft.desc.trim();
    const errors = {
      title: !title ? "Вкажіть назву завдання." : "",
      course: !course ? "Вкажіть курс." : "",
      deadline: !deadline ? "Вкажіть дедлайн." : "",
      group: !taskDraft.group ? "Оберіть групу." : "",
      desc: !desc ? "Додайте опис завдання." : "",
    };
    const invalidFields = Object.keys(errors).filter((field) => errors[field]);

    if (invalidFields.length > 0) {
      setTaskFieldErrors(errors);
      taskFieldRefs.current[invalidFields[0]]?.focus();
      const fieldLabels = { title: "назву", course: "курс", deadline: "дедлайн", group: "групу", desc: "опис" };
      showToast(`Заповніть: ${invalidFields.map((field) => fieldLabels[field]).join(", ")}`);
      return;
    }

    const dueDate = taskDraft.deadline.trim() && !Number.isNaN(Date.parse(taskDraft.deadline))
      ? new Date(taskDraft.deadline).toISOString()
      : null;
    const newTask = {
      id: Date.now(),
      title,
      course,
      deadline,
      desc,
      detail: desc,
      group: taskDraft.group,
      urgency: "gray",
      meta: deadline,
      metaIcon: "schedule",
      isImportant: taskDraft.isImportant,
      source: "manual",
    };

    if (supabase && user?.id) {
      const { data: existingCourses, error: coursesError } = await coursesApi.list();
      if (coursesError) {
        showToast(`Не вдалося завантажити курси: ${coursesError.message}`);
        return;
      }

      let selectedCourse = existingCourses?.find((item) => item.name.toLowerCase() === course.toLowerCase());
      if (!selectedCourse) {
        const { data: createdCourse, error: courseError } = await coursesApi.create({
          user_id: user.id,
          name: course,
          color: "gray",
          source: "manual",
          external_id: null,
        });
        if (courseError) {
          showToast(`Не вдалося зберегти курс: ${courseError.message}`);
          return;
        }
        selectedCourse = createdCourse;
      }

      const { data, error } = await tasksApi.create({
        user_id: user.id,
        course_id: selectedCourse.id,
        title,
        description: desc,
        due_at: dueDate,
        is_important: taskDraft.isImportant,
        source: "manual",
        external_id: null,
      });

      if (error) {
        showToast(`Не вдалося зберегти завдання: ${error.message}`);
        return;
      }

      newTask.id = data.id;
    }

    setTasks((prev) => [newTask, ...prev]);
    setTaskDraft({ title: "", course: "", deadline: "", desc: "", group: "", isImportant: false });
    setTaskFieldErrors({});
    setTaskModalOpen(false);
    showToast("Нове завдання додано");
  };

  const todayTasks = tasks.filter((t) => t.group === "today");

  const toggleSource = (src) => {
    setActiveSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  };

  const baseFiltered = filter === "today"
    ? todayTasks
    : filter === "week"
      ? tasks.filter((t) => t.group === "week")
      : filter === "important"
        ? tasks.filter((t) => t.isImportant)
        : tasks;

  const filteredTasks = baseFiltered
    .filter((t) => activeSources.length === 0 || activeSources.includes(t.source))
    .filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.course.toLowerCase().includes(q);
    });
  const visibleTodayTasks = filteredTasks.filter((task) => task.group === "today");
  const visibleOverdueTasks = filteredTasks.filter((task) => task.group === "overdue");
  const visibleWeekTasks = filteredTasks.filter((task) => task.group === "week");
  const visibleLaterTasks = filteredTasks.filter((task) => task.group === "later");

  const TaskItem = ({ task }) => {
    const done = completedIds.includes(task.id);
    const isOverdue = task.group === "overdue";
    return (
      <div
        data-compact-p
        className={`group relative bg-white dark:bg-surface-card rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-start gap-4 cursor-pointer ${done ? "opacity-40" : ""} ${isOverdue ? "border-l-2 border-l-red-500" : ""}`}
        onClick={() => onOpenTask?.(task)}
      >
        <button
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${done ? "bg-yellow-400 border-yellow-400" : isOverdue ? "border-red-400 hover:border-red-500" : "border-gray-300 hover:border-yellow-400"}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleTask(task.id);
          }}
        >
          {done && (
            <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>
              check
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white truncate">
              {task.title}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              {task.isImportant && <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: 17 }}>star</span>}
              <span className={`text-[11px] px-2 py-0.5 rounded ${isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                {task.course}
              </span>
            </div>
          </div>
          <p data-compact-hide className="text-[13px] text-gray-500 mt-1 line-clamp-1">{task.detail}</p>
          <div className="flex items-end justify-between gap-4 mt-3 text-[11px] text-gray-400">
            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {task.metaIcon}
              </span>
              {task.meta}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteTask(task);
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
              Видалити
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filterOptions = [["Усі", "all"], ["Сьогодні", "today"], ["Цього тижня", "week"], ["Важливі", "important"]];
  const updateTaskField = (field, value) => {
    setTaskDraft((prev) => ({ ...prev, [field]: value }));
    if (value.trim()) setTaskFieldErrors((errors) => ({ ...errors, [field]: "" }));
  };
  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setTaskFieldErrors({});
  };

  return (
    <div>
      <div className="bg-[#f5f7fb] dark:bg-gray-950 min-h-screen font-sans text-gray-900 dark:text-white">

        {/* Main */}
        <div>
          {/* Header */}
          <header className="fixed top-0 left-72 right-0 z-40 flex h-16 items-center justify-between bg-gray-50/80 px-8 pr-24 backdrop-blur-xl dark:bg-gray-950/80">
            <div className="flex items-center flex-1 max-w-md bg-gray-100 dark:bg-gray-900 rounded-xl px-3 py-1.5 border border-gray-200 dark:border-gray-800">
              <span className="material-symbols-outlined text-gray-400 mr-2" style={{ fontSize: 18 }}>search</span>
              <input
                className="bg-transparent border-none outline-none w-full text-[14px] placeholder:text-gray-400"
                placeholder="Пошук завдань або курсів..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600 ml-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Додати завдання
              </button>

            </div>
          </header>

          <main className="pt-16 bg-gray-50 dark:bg-gray-950 min-h-screen">
            {taskLoadError && <div className="mx-8 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">Не вдалося завантажити завдання: {taskLoadError}</div>}
            <div className="px-8 pt-8 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-semibold tracking-tight">Усі завдання</h1>
                <p className="text-[13px] text-gray-500 mt-1">Організуйте свій академічний простір в одному місці</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                  {filterOptions.map(([label, value]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === value ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Source chips */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {[
                    { src: "moodle", label: "Moodle", icon: "school", activeClass: "bg-yellow-100 text-yellow-800 border-yellow-300" },
                    { src: "google_classroom", label: "Google Classroom", icon: "class", activeClass: "bg-green-100 text-green-800 border-green-300" },
                    { src: "manual", label: "Вручну", icon: "edit", activeClass: "bg-blue-100 text-blue-800 border-blue-300" },
                  ].map(({ src, label, icon, activeClass }) => {
                    const active = activeSources.includes(src);
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => toggleSource(src)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-medium transition-all ${active ? activeClass : "bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{icon}</span>
                        {label}
                        {active && <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-24">
              {/* Tasks */}
              <div className="lg:col-span-2 space-y-8">
                <div className="space-y-3">
                  {visibleTodayTasks.length > 0 && <>
                    <GroupHeader color="bg-yellow-400" label="Сьогодні" count={visibleTodayTasks.length} />
                    <div className="space-y-2">{visibleTodayTasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
                  </>}
                </div>
                <div className="space-y-3 pt-4">
                  {visibleOverdueTasks.length > 0 && <>
                    <GroupHeader color="bg-red-500" label="Прострочено" count={visibleOverdueTasks.length} />
                    <div className="space-y-2">{visibleOverdueTasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
                  </>}
                </div>
                <div className="space-y-3 pt-4">
                  {visibleWeekTasks.length > 0 && <>
                    <GroupHeader color="bg-blue-500" label="Цього тижня" count={visibleWeekTasks.length} />
                    <div className="space-y-2">{visibleWeekTasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
                  </>}
                </div>
                <div className="space-y-3 pt-4">
                  {visibleLaterTasks.length > 0 && <GroupHeader color="bg-gray-400" label="Пізніше" count={visibleLaterTasks.length} />}
                  <div className="space-y-2">{visibleLaterTasks.map((t) => <TaskItem key={t.id} task={t} />)}</div>
                </div>
                {filteredTasks.length === 0 && <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">У цій категорії немає завдань.</div>}
              </div>

              {/* Widgets */}
              <div className="space-y-6">
                {/* Streak */}
                {streaksEnabled && (
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] uppercase tracking-wider text-gray-500">Статус активності</span>
                    <span className="material-symbols-outlined text-orange-400">local_fire_department</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-semibold">{streak} днів</span>
                    <span className="text-[11px] text-orange-400 font-medium">Серія без пропуска</span>
                  </div>
                  <p className="text-[13px] text-gray-500 mt-2">
                    Виконайте ще одне завдання сьогодні, щоб збільшити стрік до {streak + 1} днів!
                  </p>
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-3">
                      <span>Активність за тиждень</span>
                      <span>{tasks.filter(t => {
                        if (!t.completed_at) return false;
                        const d = new Date(t.completed_at);
                        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
                        return d >= weekAgo;
                      }).length} виконано за 7 днів</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-10">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        const dayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                        const count = tasks.filter(t => {
                          if (!t.completed_at) return false;
                          const cd = new Date(t.completed_at);
                          const k = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,"0")}-${String(cd.getDate()).padStart(2,"0")}`;
                          return k === dayKey;
                        }).length;
                        const isToday = i === 6;
                        const dayNames = ["Нд","Пн","Вт","Ср","Чт","Пт","Сб"];
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 flex-1">
                            <div
                              className={`w-full rounded-sm transition-all ${count > 0 ? "bg-yellow-400" : "bg-gray-100 dark:bg-gray-800"} ${isToday ? "ring-1 ring-yellow-400 ring-offset-1" : ""}`}
                              style={{ height: `${Math.max(4, Math.min(32, count * 12 + 4))}px` }}
                              title={`${dayKey}: ${count} виконано`}
                            />
                            <span className={`text-[9px] ${isToday ? "text-yellow-500 font-bold" : "text-gray-400"}`}>
                              {dayNames[d.getDay()]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                )}

                {/* Quick Note */}
                <div className="bg-gray-100 dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[16px] font-semibold">Швидка нотатка</span>
                    <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 18 }}>edit_note</span>
                  </div>
                  <textarea
                    className="w-full h-32 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-[14px] placeholder:text-gray-400 resize-none outline-none focus:border-yellow-400 transition-colors"
                    placeholder="Запишіть думку або важливу тезу з лекції..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  {savedNote && (
                    <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-white/60 p-3 text-[12px] text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Остання нотатка</span>
                        <button
                          type="button"
                          onClick={handleDeleteNote}
                          className="flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                          title="Видалити нотатку"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                          Видалити
                        </button>
                      </div>
                      {savedNote}
                    </div>
                  )}
                  <div className="flex justify-end mt-3">
                    <button onClick={handleSaveQuickNote} className="px-4 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-medium hover:opacity-90 transition-opacity">
                      Зберегти
                    </button>
                  </div>
                </div>

                {/* Moodle Sync */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] uppercase tracking-wider text-gray-500">Інтеграції</span>
                    <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 16 }}>sync</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[13px]">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${user?.moodleConnected ? "bg-yellow-400 animate-pulse" : "bg-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user?.moodleConnected ? "Moodle підключено" : "Moodle не підключено"}</p>
                        <p className="text-gray-500 text-[11px]">
                          {user?.moodleConnected
                            ? `${tasks.filter(t => t.source === "moodle").length} завдань`
                            : "Підключіть у розділі Курсів"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[13px]">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tasks.some(t => t.source === "google_classroom") ? "bg-green-400 animate-pulse" : "bg-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{tasks.some(t => t.source === "google_classroom") ? "Google Classroom підключено" : "Google Classroom не підключено"}</p>
                        <p className="text-gray-500 text-[11px]">
                          {tasks.some(t => t.source === "google_classroom")
                            ? `${tasks.filter(t => t.source === "google_classroom").length} завдань`
                            : "Синхронізуйте у Налаштуваннях"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {taskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={closeTaskModal}>
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Нове завдання</h3>
                <button type="button" onClick={closeTaskModal} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[12px] font-medium uppercase tracking-wider text-gray-500">Назва</label>
                  <input ref={(element) => { taskFieldRefs.current.title = element; }} value={taskDraft.title} onChange={(e) => updateTaskField("title", e.target.value)} aria-invalid={Boolean(taskFieldErrors.title)} className={`w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 ${taskFieldErrors.title ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"}`} placeholder="Наприклад: Лабораторна робота №3" />
                  {taskFieldErrors.title && <p className="mt-1 text-xs text-red-600">{taskFieldErrors.title}</p>}
                </div>

                <button type="button" onClick={() => setTaskDraft((current) => ({ ...current, isImportant: !current.isImportant }))} className={`flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${taskDraft.isImportant ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} aria-pressed={taskDraft.isImportant}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{taskDraft.isImportant ? "star" : "star_outline"}</span>
                  {taskDraft.isImportant ? "Важливе завдання" : "Позначити як важливе"}
                </button>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium uppercase tracking-wider text-gray-500">Курс</label>
                    <input ref={(element) => { taskFieldRefs.current.course = element; }} value={taskDraft.course} onChange={(e) => updateTaskField("course", e.target.value)} aria-invalid={Boolean(taskFieldErrors.course)} className={`w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 ${taskFieldErrors.course ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"}`} placeholder="Бази даних" />
                    {taskFieldErrors.course && <p className="mt-1 text-xs text-red-600">{taskFieldErrors.course}</p>}
                  </div>

                  <div>
                    <label className="mb-1 block text-[12px] font-medium uppercase tracking-wider text-gray-500">Дедлайн</label>
                    <input ref={(element) => { taskFieldRefs.current.deadline = element; }} type="datetime-local" value={taskDraft.deadline} onChange={(e) => updateTaskField("deadline", e.target.value)} aria-invalid={Boolean(taskFieldErrors.deadline)} className={`w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 ${taskFieldErrors.deadline ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"}`} />
                    {taskFieldErrors.deadline && <p className="mt-1 text-xs text-red-600">{taskFieldErrors.deadline}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium uppercase tracking-wider text-gray-500">Група</label>
                  <select ref={(element) => { taskFieldRefs.current.group = element; }} value={taskDraft.group} onChange={(e) => updateTaskField("group", e.target.value)} aria-invalid={Boolean(taskFieldErrors.group)} className={`w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 ${taskFieldErrors.group ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"}`}>
                    <option value="">Оберіть групу</option>
                    <option value="today">Сьогодні</option>
                    <option value="week">Цього тижня</option>
                    <option value="later">Пізніше</option>
                    <option value="overdue">Прострочено</option>
                  </select>
                  {taskFieldErrors.group && <p className="mt-1 text-xs text-red-600">{taskFieldErrors.group}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium uppercase tracking-wider text-gray-500">Опис</label>
                  <textarea ref={(element) => { taskFieldRefs.current.desc = element; }} value={taskDraft.desc} onChange={(e) => updateTaskField("desc", e.target.value)} aria-invalid={Boolean(taskFieldErrors.desc)} rows={4} className={`w-full resize-none rounded-xl border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 ${taskFieldErrors.desc ? "border-red-400 ring-2 ring-red-100" : "border-gray-200"}`} placeholder="Коротко опишіть завдання або вимоги..." />
                  {taskFieldErrors.desc && <p className="mt-1 text-xs text-red-600">{taskFieldErrors.desc}</p>}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeTaskModal} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Скасувати</button>
                <button type="button" onClick={handleAddTask} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90">Додати</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce-once ${toast.startsWith("Заповніть") || toast.startsWith("Не вдалося") ? "bg-red-600 text-white" : "bg-gray-900 text-white dark:bg-white dark:text-gray-900"}`}>
            <span className={`material-symbols-outlined ${toast.startsWith("Заповніть") || toast.startsWith("Не вдалося") ? "text-white" : "text-yellow-400"}`}>{toast.startsWith("Заповніть") || toast.startsWith("Не вдалося") ? "error" : "local_fire_department"}</span>
            <div>
              <p className="text-[16px] font-semibold">{toast.startsWith("Заповніть") || toast.startsWith("Не вдалося") ? "Не збережено" : "Готово"}</p>
              <p className="text-[11px] opacity-80">{toast}</p>
            </div>
          </div>
        )}

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <span className="text-[12px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                  {modal.course}
                </span>
                <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>
              <div className="py-6 space-y-4">
                <h2 className="text-[20px] font-semibold">{modal.title}</h2>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                  {modal.deadline}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1 font-medium">Опис завдання</p>
                  <p className="text-[14px] leading-relaxed">{modal.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-[12px] font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  Закрити
                </button>
                <button onClick={completeFromModal} className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                  Позначити виконаним
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
