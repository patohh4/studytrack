import { useEffect, useState } from "react";
import Calendar from "./components/Calendar/calendar.jsx";
import CourseList from "./components/CourseList/courselist.jsx";
import Dashboard from "./components/Dashboard/dashboard.jsx";
import Admin from "./components/Admin/Admin.jsx";
import Login from "./components/Login/Login.jsx";
import StudentProfile from "./components/Profile/profile.jsx";
import Settings from "./components/Settings/settings.jsx";
import TaskDetails from "./components/TaskDetails/TaskDetails.jsx";
import { supabase } from "./lib/supabase.js";
import { calcStreak } from "./lib/progress.js";
import { userSettingsApi, moodleProxyApi, classroomApi } from "./lib/api.js";

const pages = [
  ["dashboard", "Головна", Dashboard],
  ["calendar", "Календар", Calendar],
  ["courses", "Курси", CourseList],
  ["profile", "Профіль", StudentProfile],
  ["settings", "Налаштування", Settings],
  ["admin", "Адмін-панель", Admin],
];

function SideNavigation({ activePage, onNavigate, isAdmin, user, courses, streak, streaksEnabled = true }) {
  const navigation = [
    ["checklist", "Усі завдання", "dashboard"],
    ["calendar_today", "Календар", "calendar"],
    ["school", "Курси", "courses"],
    ["military_tech", "Профіль & Досягнення", "profile"],
    ["settings", "Налаштування", "settings"],
  ];

  const colorMap = {
    yellow: "bg-yellow-400", orange: "bg-orange-400", green: "bg-green-400",
    blue: "bg-blue-400", purple: "bg-purple-400", red: "bg-red-400",
    gray: "bg-gray-400", pink: "bg-pink-400", amber: "bg-amber-500",
  };

  const sidebarCourses = courses?.length
    ? courses.map((c) => ({ color: colorMap[c.color] || "bg-gray-400", name: c.name }))
    : [];

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#e5e5ea] bg-white px-4 py-6 text-[#1d1d1f]">
      <div className="mb-6 flex flex-col gap-1 px-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold tracking-tight">StudyTrack</span>
          {streaksEnabled && streak > 0 && (
            <span className="rounded-full bg-[#f1f1f3] px-2 py-1 text-[11px] font-medium text-orange-500">🔥 {streak} днів</span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[11px] text-[#6e6e73]"><span className={`h-1.5 w-1.5 rounded-full ${user?.moodleConnected ? "bg-yellow-400" : "bg-gray-400"}`} />Moodle: {user?.moodleConnected ? "Підключено" : "Не підключено"}</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-1">
        <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-[#9a9aa0]">Меню</div>
        {navigation.map(([icon, label, key]) => (
          <button
            key={label}
            type="button"
            className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${activePage === key ? "bg-blue-50 font-semibold text-blue-700" : "text-[#6e6e73] hover:bg-blue-50 hover:text-blue-700"}`}
            onClick={() => onNavigate(key)}
          >
            <span className="material-symbols-outlined mr-3" style={{ fontSize: 19 }}>{icon}</span>
            {label}
          </button>
        ))}
        {isAdmin && (
          <button
            type="button"
            className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${activePage === "admin" ? "bg-blue-50 font-semibold text-blue-700" : "text-[#6e6e73] hover:bg-blue-50 hover:text-blue-700"}`}
            onClick={() => onNavigate("admin")}
          >
            <span className="material-symbols-outlined mr-3" style={{ fontSize: 19 }}>admin_panel_settings</span>
            Адмін-панель
          </button>
        )}
        <div className="px-3 pb-2 pt-5 text-[11px] uppercase tracking-wider text-[#9a9aa0]">Курси</div>
        {sidebarCourses.length ? sidebarCourses.map(({ color, name }) => (
          <button key={name} type="button" onClick={() => onNavigate("courses")} className="flex w-full items-center rounded-lg px-3 py-1.5 text-left text-[13px] text-[#6e6e73] transition-colors hover:bg-blue-50 hover:text-blue-700">
            <span className={`mr-2.5 h-2 w-2 rounded-full shrink-0 ${color}`} />
            <span className="truncate">{name}</span>
          </button>
        )) : (
          <p className="px-3 py-2 text-[12px] text-[#9a9aa0]">Курсів ще немає</p>
        )}
      </nav>
      <button type="button" onClick={() => onNavigate("profile")} className="flex min-w-0 items-center gap-3 border-t border-[#e5e5ea] px-3 pt-4 text-left">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="Аватар користувача" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">{(user?.full_name || user?.email || "К").slice(0, 1).toUpperCase()}</span>
        )}
        <span className="min-w-0">
          <span className="block break-words text-sm font-medium text-[#1d1d1f]">{user?.full_name || user?.email?.split("@")[0] || "Користувач"}</span>
          <span className="block break-all text-xs text-[#6e6e73]">{user?.email || "email@domain.com"}</span>
        </span>
      </button>
    </aside>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => supabase ? false : sessionStorage.getItem("studytrack-auth") === "true");
  const [isAdmin, setIsAdmin] = useState(!supabase);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileLoadError, setProfileLoadError] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedTask, setSelectedTask] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCourses, setSidebarCourses] = useState([]);
  const [sidebarStreak, setSidebarStreak] = useState(0);
  const [sidebarStreaksEnabled, setSidebarStreaksEnabled] = useState(true);
  const visiblePage = !isAdmin && activePage === "admin" ? "dashboard" : activePage;
  const [, , Page] = pages.find(([key]) => key === visiblePage) || pages[0];
  const userName = currentUser?.full_name || currentUser?.email?.split("@")[0] || "Користувач";
  const userInitial = userName.slice(0, 1).toUpperCase();

  const loadSidebarData = async (userId) => {
    if (!supabase || !userId) return;
    const [{ data: courses }, { data: tasks }, { data: settings }] = await Promise.all([
      supabase.from("courses").select("name, color").eq("user_id", userId).order("name"),
      supabase.from("tasks").select("completed_at").eq("user_id", userId),
      supabase.from("user_settings").select("streaks_enabled").eq("user_id", userId).maybeSingle(),
    ]);
    setSidebarCourses(courses || []);
    setSidebarStreak(calcStreak(tasks || []));
    setSidebarStreaksEnabled(settings?.streaks_enabled ?? true);
  };

  // ── Тема: завантажуємо з localStorage при старті ──────────────────────
  useEffect(() => {
    const applyTheme = (theme) => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = theme === "dark" || (theme === "system" && prefersDark);
      document.documentElement.classList.toggle("dark", isDark);
    };

    const saved = localStorage.getItem("studytrack-theme") || "system";
    applyTheme(saved);

    // Компактний режим
    if (localStorage.getItem("studytrack-compact") === "true") {
      document.documentElement.classList.add("compact");
    }

    // Реагуємо на зміну системної теми (для mode=system)
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMqChange = () => {
      const current = localStorage.getItem("studytrack-theme") || "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onMqChange);
    return () => mq.removeEventListener("change", onMqChange);
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;

    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session) {
        if (mounted) {
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
        return;
      }

      setIsAuthenticated(true);

      if (session.provider_token) {
        localStorage.setItem("google_provider_token", session.provider_token);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, phone, university, course, group_name, avatar_url, role")
        .eq("id", session.user.id)
        .maybeSingle();
      const { data: moodleConnection } = await supabase
        .from("moodle_connections")
        .select("last_synced_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileError) setProfileLoadError(profileError.message);

      if (mounted) {
        setCurrentUser({
          id: session.user.id,
          email: profile?.email || session.user.email,
          phone: profile?.phone || "",
          university: profile?.university || "",
          course: profile?.course || "",
          group_name: profile?.group_name || "",
          full_name: profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Користувач",
          avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || null,
          moodleConnected: Boolean(moodleConnection),
          role: profile?.role || "student",
        });
        setIsAdmin(profile?.role === "admin");
        loadSidebarData(session.user.id);
      }
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setCurrentUser(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, phone, university, course, group_name, avatar_url, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) setProfileLoadError(profileError.message);

      const { data: moodleConnection } = await supabase
        .from("moodle_connections")
        .select("last_synced_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setIsAuthenticated(true);
      if (session.provider_token) {
        localStorage.setItem("google_provider_token", session.provider_token);
      }
      setCurrentUser({
        id: session.user.id,
        email: profile?.email || session.user.email,
        phone: profile?.phone || "",
        university: profile?.university || "",
        course: profile?.course || "",
        group_name: profile?.group_name || "",
        full_name: profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Користувач",
        avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || null,
        moodleConnected: Boolean(moodleConnection),
        role: profile?.role || "student",
      });
      setIsAdmin(profile?.role === "admin");
      loadSidebarData(session.user.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Фонова автосинхронізація Moodle + Google Classroom ───────────────
  useEffect(() => {
    if (!supabase || !currentUser?.id) return;

    let intervalId = null;

    const runSync = async () => {
      // --- Moodle ---
      const { data: conn } = await supabase
        .from("moodle_connections")
        .select("moodle_session, sesskey, base_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (conn?.moodle_session) {
        const { data: courses } = await supabase
          .from("courses")
          .select("id, external_id")
          .eq("user_id", currentUser.id)
          .eq("source", "moodle");

        for (const course of (courses ?? [])) {
          if (course.external_id) {
            await moodleProxyApi.syncCourseContent(
              conn.base_url,
              conn.moodle_session,
              conn.sesskey,
              course.external_id
            );
          }
        }
      }

      // --- Google Classroom ---
      const providerToken = localStorage.getItem("google_provider_token");
      if (providerToken) {
        await classroomApi.sync();
      }

      // Оновлюємо sidebar після синхронізації
      loadSidebarData(currentUser.id);
    };

    const startInterval = async () => {
      const { data: settings } = await userSettingsApi.get();
      const minutes = settings?.sync_interval_minutes ?? 30;
      if (minutes === 0) return; // вручну — не запускаємо

      intervalId = setInterval(runSync, minutes * 60 * 1000);
    };

    startInterval();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser?.id]);

  const openTask = (task) => setSelectedTask(task);
  const closeTask = () => setSelectedTask(null);

  const handleLogin = () => {
    sessionStorage.setItem("studytrack-auth", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (supabase) supabase.auth.signOut();
    sessionStorage.removeItem("studytrack-auth");
    localStorage.removeItem("google_provider_token");
    setSelectedTask(null);
    setIsAdmin(false);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <SideNavigation
        activePage={visiblePage}
        isAdmin={isAdmin}
        user={currentUser}
        courses={sidebarCourses}
        streak={sidebarStreak}
        streaksEnabled={sidebarStreaksEnabled}
        onNavigate={(page) => {
          closeTask();
          setActivePage(page);
          setProfileMenuOpen(false);
        }}
      />
      <main className="min-h-screen pl-72">
        {visiblePage === "dashboard" && <div className="fixed right-6 top-3 z-50">
          <button
            type="button"
            aria-label="Відкрити меню профілю"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-white shadow-sm transition hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="Аватар користувача" className="h-full w-full object-cover" /> : <span className="text-sm font-medium">{userInitial}</span>}
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 top-12 w-60 rounded-xl border border-gray-100 bg-white p-2 text-gray-900 shadow-xl">
              <div className="flex items-center gap-3 border-b border-gray-100 px-3 pb-3 pt-2">
                {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="Аватар користувача" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">{userInitial}</span>}
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{userName}</p>
                  <p className="mt-1 break-all text-xs text-gray-500">{currentUser?.email || "email@domain.com"}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setActivePage("profile"); setProfileMenuOpen(false); }} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person</span>
                Профіль
              </button>
              <button type="button" onClick={() => { setActivePage("settings"); setProfileMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
                Налаштування
              </button>
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                Вийти
              </button>
            </div>
          )}
        </div>}
        {selectedTask ? (
          <TaskDetails task={selectedTask} onBack={closeTask} onComplete={closeTask} onTaskUpdate={setSelectedTask} />
        ) : (
          <Page
            key={currentUser?.id || "guest"}
            onNavigate={setActivePage}
            onOpenTask={openTask}
            onLogout={handleLogout}
            user={currentUser}
            onUserUpdate={setCurrentUser}
            profileLoadError={profileLoadError}
            onSidebarRefresh={() => loadSidebarData(currentUser?.id)}
          />
        )}
      </main>
    </div>
  );
}
