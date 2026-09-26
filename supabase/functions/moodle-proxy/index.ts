import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Конвертує Moodle HTML в читабельний текст зі збереженням структури списків */
function convertMoodleHtml(html: string): string {
  let counter = 0;
  return html
    .replace(/<ol[^>]*>/gi, "__OL_START__")
    .replace(/<\/ol>/gi, "__OL_END__")
    .replace(/<ul[^>]*>/gi, "")
    .replace(/<\/ul>/gi, "")
    .replace(/__OL_START__([\s\S]*?)__OL_END__/g, (_, inner) => {
      counter = 0;
      return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, content) => {
        counter++;
        return `\n${counter}. ${content.replace(/<[^>]*>/g, "").trim()}`;
      });
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => `\n• ${content.replace(/<[^>]*>/g, "").trim()}`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 5000);
}

// ── Типи ─────────────────────────────────────────────────────────────────────

interface MoodleCourse {
  id: number;
  fullname?: string;
  shortname?: string;
}

interface MoodleModule {
  id: number;
  name: string;
  modname: string;
  url?: string;
  description?: string;
}

interface MoodleSection {
  id: number;
  name: string;
  section: number;
  modules: MoodleModule[];
}

interface MoodleAssignment {
  id: number;
  name: string;
  duedate?: number;
}

// ── Утиліти ───────────────────────────────────────────────────────────────────

/** Отримує свіжий sesskey парсячи перші 8KB головної сторінки Moodle */
async function fetchSesskey(baseUrl: string, cookie: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${baseUrl}/my/`, {
      headers: { "Cookie": cookie },
      redirect: "follow",
      signal: controller.signal,
    });
    console.log("fetchSesskey HTTP status:", res.status, "url:", res.url);
    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = "";
    while (html.length < 8192) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      if (html.includes('"sesskey"')) break;
    }
    reader.cancel().catch(() => {});

    const match = html.match(/"sesskey"\s*:\s*"([a-zA-Z0-9]+)"/) ||
                  html.match(/"sesskey":"([a-zA-Z0-9]+)"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Надсилає запит до Moodle AJAX API */
async function callMoodleAjax(
  baseUrl: string,
  sesskey: string,
  cookie: string,
  methodname: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/lib/ajax/service.php?sesskey=${sesskey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": cookie },
      body: JSON.stringify([{ index: 0, methodname, args }]),
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(
      err instanceof Error && err.message.includes("abort")
        ? "Moodle не відповів за 20 секунд — можливо сесія протухла"
        : String(err)
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new Error(`Moodle HTTP ${res.status}`);

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) {
    throw new Error("MoodleSession протухла — підключіть Moodle знову на сторінці Курси");
  }

  const data = await res.json();
  const item = Array.isArray(data) ? data[0] : null;
  if (item?.error) {
    // Moodle повертає або рядок або { exception: { message, errorcode } }
    const errMsg = item.exception?.message ?? item.exception?.errorcode ?? String(item.error);
    console.log("Moodle error item:", JSON.stringify(item).slice(0, 300));
    throw new Error(errMsg);
  }
  return item?.data;
}

// ── Головний обробник ─────────────────────────────────────────────────────────

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Only POST is supported" }, 405);
  }

  // Авторизація
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "Authorization header is required" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: "Invalid session" }, 401);
  }

  // Парсимо тіло
  const body = await request.json().catch(() => ({}));
  const { moodleUrl, moodleSession, sesskey, action, courseId } = body;

  if (!moodleUrl || !moodleSession) {
    return json({ error: "moodleUrl і moodleSession обов'язкові" }, 400);
  }

  const baseUrl = String(moodleUrl).replace(/\/$/, "");
  const cookie  = `MoodleSession=${moodleSession}`;

  // Отримуємо свіжий sesskey автоматично
  console.log("fetchSesskey start:", baseUrl);
  const freshSesskey = await fetchSesskey(baseUrl, cookie);
  console.log("fetchSesskey result:", freshSesskey ? "GOT_KEY" : "NULL");
  const activeSesskey = freshSesskey ?? String(sesskey ?? "");

  if (!activeSesskey) {
    return json({ error: "MoodleSession протухла — підключіть Moodle знову на сторінці Курси" }, 401);
  }

  // Якщо sesskey оновився — зберігаємо в БД (fire-and-forget)
  if (freshSesskey && freshSesskey !== sesskey) {
    supabase.from("moodle_connections")
      .update({ sesskey: freshSesskey })
      .eq("user_id", user.id)
      .then(() => {})
      .catch(() => {});
  }

  console.log("action:", action, "activeSesskey length:", activeSesskey.length);

  try {
    // ── connect / courses ───────────────────────────────────────────────────
    if (action === "connect" || action === "test" || action === "courses") {
      const rawData = await callMoodleAjax(baseUrl, activeSesskey, cookie,
        "core_course_get_enrolled_courses_by_timeline_classification",
        { offset: 0, limit: 0, classification: "all", sort: "fullname" },
      );

      const rawCourses: MoodleCourse[] = Array.isArray(rawData)
        ? rawData as MoodleCourse[]
        : Array.isArray((rawData as { courses?: MoodleCourse[] })?.courses)
          ? (rawData as { courses: MoodleCourse[] }).courses
          : [];

      if (action === "connect") {
        const { error: upsertErr } = await supabase.from("moodle_connections").upsert({
          user_id:        user.id,
          base_url:       baseUrl,
          moodle_session: moodleSession,
          sesskey:        activeSesskey,
          connected_at:   new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (upsertErr) return json({ error: upsertErr.message }, 500);

        for (const c of rawCourses) {
          await supabase.from("courses").upsert({
            user_id:     user.id,
            name:        c.fullname ?? c.shortname ?? `Course ${c.id}`,
            color:       "gray",
            source:      "moodle",
            external_id: String(c.id),
          }, { onConflict: "user_id,source,external_id" });
        }

        return json({ ok: true, courses: rawCourses.length });
      }

      return json({ ok: true, courses: rawCourses });
    }

    // ── sync_course_content ─────────────────────────────────────────────────
    if (action === "sync_course_content") {
      // Отримуємо всі події з календаря з пагінацією (Moodle дозволяє max 50 за раз)
      const timesortfrom = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90;  // 90 днів назад
      const timesortto   = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180;

      type MoodleEvent = {
        id: number;
        name: string;
        description?: string;
        timestart?: number;
        timeduration?: number;
        timesort?: number;
        course?: { id: number; fullname?: string };
      };

      const allEvents: MoodleEvent[] = [];
      let afterEventId = 0;

      while (true) {
        const params: Record<string, unknown> = {
          timesortfrom,
          timesortto,
          limitnum: 50,
        };
        if (afterEventId > 0) params.aftereventid = afterEventId;

        const page = await callMoodleAjax(baseUrl, activeSesskey, cookie,
          "core_calendar_get_action_events_by_timesort",
          params,
        ) as { events?: MoodleEvent[] };

        const batch = page?.events ?? [];
        allEvents.push(...batch);

        if (batch.length < 50) break; // остання сторінка
        afterEventId = batch[batch.length - 1].id;
      }

      const events = allEvents;

      // Завантажуємо всі Moodle курси юзера з БД
      const { data: userCourses } = await supabase
        .from("courses")
        .select("id, external_id")
        .eq("user_id", user.id)
        .eq("source", "moodle");

      const courseMap = new Map<string, string>();
      for (const c of userCourses ?? []) {
        if (c.external_id) courseMap.set(String(c.external_id), c.id);
      }

      const tasksRows: Record<string, unknown>[] = [];

      for (const event of events) {
        const moodleCourseId = String(event.course?.id ?? "");
        const internalCourseId = courseMap.get(moodleCourseId);
        if (!internalCourseId) continue;

        // DEBUG: показуємо ПОВНИЙ сирий об'єкт події
        console.log("EVENT_FULL", JSON.stringify(event));

        // timesort — це і є реальний дедлайн завдання (за яким API сортує).
        // timestart — дата відкриття/публікації, НЕ дедлайн.
        const dueTimestamp = event.timesort
          ?? (event.timestart ? event.timestart + (event.timeduration ?? 0) : null);
        const dueAt = dueTimestamp ? new Date(dueTimestamp * 1000).toISOString() : null;

        tasksRows.push({
          user_id:     user.id,
          course_id:   internalCourseId,
          title:       event.name
            .replace(/^Строк\s+/i, "")
            .replace(/\s+спливає$/i, "")
            .trim(),
          description: event.description
            ? convertMoodleHtml(event.description) || null
            : null,
          due_at:      dueAt,
          source:      "moodle",
          external_id: `moodle-cal-${event.id}`,
        });
      }

      const CHUNK = 50;
      for (let i = 0; i < tasksRows.length; i += CHUNK) {
        const { error: e } = await supabase.from("tasks")
          .upsert(tasksRows.slice(i, i + CHUNK), { onConflict: "user_id,source,external_id" });
        if (e) return json({ error: `tasks: ${e.message}` }, 500);
      }

      await supabase.from("moodle_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", user.id);

      return json({ ok: true, tasks: tasksRows.length, events: events.length });
    }


    // ── deadlines ───────────────────────────────────────────────────────────
    if (action === "deadlines") {
      const data = await callMoodleAjax(baseUrl, activeSesskey, cookie,
        "core_calendar_get_action_events_by_timesort",
        {
          timesortfrom: Math.floor(Date.now() / 1000),
          timesortto:   Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
          limitnum:     50,
        },
      );
      return json(data);
    }

    // ── grades ──────────────────────────────────────────────────────────────
    if (action === "grades") {
      const data = await callMoodleAjax(baseUrl, activeSesskey, cookie,
        "gradereport_overview_get_course_grades",
        { userid: 0 },
      );
      return json(data);
    }

    return json({ error: `Невідома дія: ${action}` }, 400);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("moodle-proxy error:", msg);
    return json({ error: msg }, 500);
  }
});
