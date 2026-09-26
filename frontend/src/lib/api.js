import { supabase } from "./supabase.js";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}

const getGoogleRedirectUrl = () => {
  const origin = window.location.origin;
  if (origin.includes("localhost")) {
    return "http://localhost:5173";
  }
  return origin;
};

export const authApi = {
  signInWithGoogle: () => requireSupabase().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getGoogleRedirectUrl()}/auth/callback`,
      scopes: [
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
        "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
        "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
      ].join(" "),
    },
  }),
  signIn: (email, password) => requireSupabase().auth.signInWithPassword({ email, password }),
  signUp: (email, password, fullName) => requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  }),
  resetPassword: (email) => requireSupabase().auth.resetPasswordForEmail(email),
  signOut: () => requireSupabase().auth.signOut(),
};

export const coursesApi = {
  list: () => requireSupabase().from("courses").select("*").order("name"),
  create: (course) => requireSupabase().from("courses").insert(course).select().single(),
  update: (id, changes) => requireSupabase().from("courses").update(changes).eq("id", id).select().single(),
  remove: (id) => requireSupabase().from("courses").delete().eq("id", id),
};

export const tasksApi = {
  list: () => requireSupabase().from("tasks").select("*, courses(name, color)").order("due_at"),
  create: (task) => requireSupabase().from("tasks").insert(task).select().single(),
  update: (id, changes) => requireSupabase().from("tasks").update(changes).eq("id", id).select().single(),
  remove: (id) => requireSupabase().from("tasks").delete().eq("id", id),
};

export const materialsApi = {
  listByCourse: (courseId) =>
    requireSupabase()
      .from("course_materials")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false }),
};

export const userSettingsApi = {
  /** Завантажити налаштування. Якщо рядка ще немає — повертає дефолти. */
  get: async () => {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("user_settings")
      .select("streaks_enabled, notif_streak_enabled, notif_hour, sync_interval_minutes")
      .maybeSingle();
    if (error) return { data: null, error };
    return {
      data: data ?? {
        streaks_enabled: true,
        notif_streak_enabled: false,
        notif_hour: 20,
        sync_interval_minutes: 30,
      },
      error: null,
    };
  },

  /** Зберегти налаштування (upsert). user_id береться з RLS. */
  save: (userId, settings) =>
    requireSupabase()
      .from("user_settings")
      .upsert({ user_id: userId, ...settings }, { onConflict: "user_id" }),
};

export const moodleApi = {
  sync: (baseUrl, token) => requireSupabase().functions.invoke("moodle-sync", {
    body: { baseUrl, token },
  }),
};

export const moodleProxyApi = {
  connect: (moodleUrl, moodleSession, sesskey) =>
    requireSupabase().functions.invoke("moodle-proxy", {
      body: { moodleUrl, moodleSession, sesskey, action: "connect" },
    }),

  /** Синхронізує всі матеріали і завдання одного курсу */
  syncCourseContent: (moodleUrl, moodleSession, sesskey, courseId) =>
    requireSupabase().functions.invoke("moodle-proxy", {
      body: { moodleUrl, moodleSession, sesskey, action: "sync_course_content", courseId },
    }),

  getCourses: (moodleUrl, moodleSession, sesskey) =>
    requireSupabase().functions.invoke("moodle-proxy", {
      body: { moodleUrl, moodleSession, sesskey, action: "courses" },
    }),

  getDeadlines: (moodleUrl, moodleSession, sesskey) =>
    requireSupabase().functions.invoke("moodle-proxy", {
      body: { moodleUrl, moodleSession, sesskey, action: "deadlines" },
    }),

  getGrades: (moodleUrl, moodleSession, sesskey) =>
    requireSupabase().functions.invoke("moodle-proxy", {
      body: { moodleUrl, moodleSession, sesskey, action: "grades" },
    }),
};

export const adminApi = {
  overview: async () => {
    const client = requireSupabase();
    const [profiles, courses, tasks, moodleConnections] = await Promise.all([
      client.from("profiles").select("id, full_name, role, created_at").order("created_at", { ascending: false }),
      client.from("courses").select("id, name, source, user_id").order("created_at", { ascending: false }),
      client.from("tasks").select("id, title, source, completed_at").order("created_at", { ascending: false }),
      client.from("moodle_connections").select("id, base_url, last_synced_at").order("connected_at", { ascending: false }),
    ]);
    const requestError = profiles.error || courses.error || tasks.error || moodleConnections.error;

    return {
      data: requestError ? null : {
        profiles: profiles.data || [],
        courses: courses.data || [],
        tasks: tasks.data || [],
        moodle_connections: moodleConnections.data || [],
      },
      error: requestError,
    };
  },
};

export const classroomApi = {
  sync: () => {
    const providerToken = localStorage.getItem("google_provider_token");
    return requireSupabase().functions.invoke("google-classroom-sync", {
      body: { provider_token: providerToken },
    });
  },
};
