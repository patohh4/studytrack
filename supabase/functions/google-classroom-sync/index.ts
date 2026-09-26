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

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  courseState: string;
}

interface DueDate {
  year: number;
  month: number;
  day: number;
}

interface DueTime {
  hours?: number;
  minutes?: number;
}

interface CourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: DueDate;
  dueTime?: DueTime;
  state: string;
}

interface CourseMaterial {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state: string;
  materials?: Array<{
    driveFile?: { driveFile?: { title?: string; alternateLink?: string } };
    youtubeVideo?: { title?: string; alternateLink?: string };
    link?: { url?: string; title?: string };
    form?: { title?: string; formUrl?: string };
  }>;
}

function buildDueAt(dueDate?: DueDate, dueTime?: DueTime): string | null {
  if (!dueDate) return null;
  try {
    const hours = dueTime?.hours ?? 23;
    const minutes = dueTime?.minutes ?? 59;
    const d = new Date(Date.UTC(dueDate.year, dueDate.month - 1, dueDate.day, hours, minutes, 0));
    return d.toISOString();
  } catch (e) {
    console.error("[buildDueAt] failed:", e, { dueDate, dueTime });
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log("[google-classroom-sync] request received", req.method);

  // ── Supabase client ───────────────────────────────────────────────────────
  let supabase: ReturnType<typeof createClient>;
  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
  } catch (e) {
    console.error("[google-classroom-sync] supabase init failed:", e);
    return json({ error: "Internal server error: supabase init failed", detail: String(e) }, 500);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  console.log("[google-classroom-sync] auth header present:", Boolean(authHeader));
  if (!authHeader) return json({ error: "Missing authorization header" }, 401);

  let user: { id: string } | null = null;
  try {
    const { data, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError) {
      console.error("[google-classroom-sync] auth error:", authError);
      return json({ error: "Unauthorized", detail: authError.message }, 401);
    }
    user = data.user;
    console.log("[google-classroom-sync] authenticated user:", user?.id);
  } catch (e) {
    console.error("[google-classroom-sync] auth threw:", e);
    return json({ error: "Auth check failed", detail: String(e) }, 500);
  }

  if (!user) return json({ error: "Unauthorized: no user" }, 401);

  // ── Parse body ────────────────────────────────────────────────────────────
  let providerToken: string | null = null;
  try {
    const body = await req.json();
    providerToken = body?.provider_token ?? null;
    console.log("[google-classroom-sync] provider_token present:", Boolean(providerToken));
  } catch (e) {
    console.error("[google-classroom-sync] body parse failed:", e);
    return json({ error: "Failed to parse request body", detail: String(e) }, 400);
  }

  if (!providerToken) {
    return json({ error: "Missing provider_token. Please re-login with Google to get a fresh token." }, 400);
  }

  // ── Fetch courses ─────────────────────────────────────────────────────────
  let courses: ClassroomCourse[] = [];
  try {
    console.log("[google-classroom-sync] fetching courses from Google...");
    const coursesRes = await fetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=50",
      { headers: { Authorization: `Bearer ${providerToken}` } },
    );

    console.log("[google-classroom-sync] courses API status:", coursesRes.status);

    if (!coursesRes.ok) {
      const errText = await coursesRes.text();
      console.error("[google-classroom-sync] courses API error body:", errText);
      return json({
        error: `Google Classroom API returned ${coursesRes.status}`,
        detail: errText,
        hint: coursesRes.status === 401
          ? "Token expired or missing Classroom scope. Re-login with Google."
          : coursesRes.status === 403
          ? "Access denied. Make sure Classroom API is enabled in Google Cloud Console and scopes are approved."
          : undefined,
      }, 502);
    }

    const coursesData = await coursesRes.json() as { courses?: ClassroomCourse[] };
    courses = coursesData.courses ?? [];
    console.log("[google-classroom-sync] courses fetched:", courses.length);
  } catch (e) {
    console.error("[google-classroom-sync] fetch courses threw:", e);
    return json({ error: "Failed to fetch courses from Google", detail: String(e) }, 502);
  }

  if (courses.length === 0) {
    return json({ ok: true, courses: 0, tasks: 0, message: "No active courses found in Google Classroom" });
  }

  // ── Upsert courses ────────────────────────────────────────────────────────
  try {
    const courseRows = courses.map((c) => ({
      user_id: user!.id,
      name: c.name,
      color: "green",
      source: "google_classroom",
      external_id: `gc-${c.id}`,
    }));

    console.log("[google-classroom-sync] upserting", courseRows.length, "courses...");
    const { data: upsertData, error: coursesUpsertError } = await supabase
      .from("courses")
      .upsert(courseRows, { onConflict: "user_id,source,external_id" });

    if (coursesUpsertError) {
      console.error("[google-classroom-sync] courses upsert error:", JSON.stringify(coursesUpsertError));
      return json({
        error: `courses upsert failed: ${coursesUpsertError.message}`,
        detail: coursesUpsertError,
        code: coursesUpsertError.code,
        hint: coursesUpsertError.hint,
      }, 500);
    }
    console.log("[google-classroom-sync] courses upsert result:", JSON.stringify(upsertData));
  } catch (e) {
    console.error("[google-classroom-sync] courses upsert threw:", e);
    return json({ error: "courses upsert threw exception", detail: String(e) }, 500);
  }

  // ── Load saved courses for ID mapping ─────────────────────────────────────
  const courseMap = new Map<string, string>();
  try {
    const { data: savedCourses, error: loadError } = await supabase
      .from("courses")
      .select("id, external_id")
      .eq("user_id", user.id)
      .eq("source", "google_classroom");

    if (loadError) {
      console.error("[google-classroom-sync] load saved courses error:", loadError);
      return json({ error: `load courses failed: ${loadError.message}` }, 500);
    }

    for (const c of savedCourses ?? []) {
      if (c.external_id) courseMap.set(c.external_id, c.id);
    }
    console.log("[google-classroom-sync] courseMap size:", courseMap.size);
  } catch (e) {
    console.error("[google-classroom-sync] load courses threw:", e);
    return json({ error: "load courses threw exception", detail: String(e) }, 500);
  }

  // ── Fetch courseWork ──────────────────────────────────────────────────────
  let totalTasks = 0;
  const taskRows: Record<string, unknown>[] = [];

  for (const course of courses) {
    try {
      console.log(`[google-classroom-sync] fetching courseWork for course ${course.id} (${course.name})...`);
      const cwRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?pageSize=50`,
        { headers: { Authorization: `Bearer ${providerToken}` } },
      );

      console.log(`[google-classroom-sync] courseWork status for ${course.id}:`, cwRes.status);

      if (!cwRes.ok) {
        const errText = await cwRes.text();
        console.warn(`[google-classroom-sync] courseWork failed for course ${course.id}:`, cwRes.status, errText);
        continue; // skip this course, don't abort
      }

      const cwData = await cwRes.json() as { courseWork?: CourseWork[] };
      const courseWork = cwData.courseWork ?? [];
      console.log(`[google-classroom-sync] courseWork items for ${course.id}:`, courseWork.length);

      const internalCourseId = courseMap.get(`gc-${course.id}`);
      if (!internalCourseId) {
        console.warn(`[google-classroom-sync] no internal ID for gc-${course.id}, skipping`);
        continue;
      }

      for (const cw of courseWork) {
        if (cw.state !== "PUBLISHED") continue;
        taskRows.push({
          user_id: user.id,
          course_id: internalCourseId,
          title: cw.title,
          description: cw.description?.slice(0, 1000) ?? null,
          due_at: buildDueAt(cw.dueDate, cw.dueTime),
          source: "google_classroom",
          external_id: `gc-cw-${cw.id}`,
        });
        totalTasks++;
      }
    } catch (e) {
      console.error(`[google-classroom-sync] courseWork fetch threw for course ${course.id}:`, e);
      // continue with other courses
    }
  }

  // ── Upsert tasks ──────────────────────────────────────────────────────────
  const CHUNK = 50;
  try {
    console.log("[google-classroom-sync] upserting", taskRows.length, "tasks...");
    for (let i = 0; i < taskRows.length; i += CHUNK) {
      const { error: tasksError } = await supabase
        .from("tasks")
        .upsert(taskRows.slice(i, i + CHUNK), { onConflict: "user_id,source,external_id" });

      if (tasksError) {
        console.error("[google-classroom-sync] tasks upsert error:", tasksError);
        return json({ error: `tasks upsert failed: ${tasksError.message}`, detail: tasksError }, 500);
      }
    }
  } catch (e) {
    console.error("[google-classroom-sync] tasks upsert threw:", e);
    return json({ error: "tasks upsert threw exception", detail: String(e) }, 500);
  }

  console.log("[google-classroom-sync] done. courses:", courses.length, "tasks:", totalTasks);

  // ── Fetch courseWorkMaterials ─────────────────────────────────────────────
  const materialRows: Record<string, unknown>[] = [];

  for (const course of courses) {
    try {
      const matRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWorkMaterials?pageSize=50`,
        { headers: { Authorization: `Bearer ${providerToken}` } },
      );

      if (!matRes.ok) {
        console.warn(`[google-classroom-sync] materials failed for ${course.id}:`, matRes.status);
        continue;
      }

      const matData = await matRes.json() as { courseWorkMaterial?: CourseMaterial[] };
      const materials = (matData.courseWorkMaterial ?? []).filter((m) => m.state === "PUBLISHED");

      const internalCourseId = courseMap.get(`gc-${course.id}`);
      if (!internalCourseId) continue;

      for (const mat of materials) {
        // Витягуємо перше посилання з вкладень
        let url: string | null = null;
        if (mat.materials?.length) {
          const first = mat.materials[0];
          url = first.driveFile?.driveFile?.alternateLink
            ?? first.youtubeVideo?.alternateLink
            ?? first.link?.url
            ?? first.form?.formUrl
            ?? null;
        }

        materialRows.push({
          user_id: user!.id,
          course_id: internalCourseId,
          module_type: "material",
          title: mat.title,
          description: mat.description?.slice(0, 2000) ?? null,
          url,
          external_id: `gc-mat-${mat.id}`,
          external_course_id: `gc-${course.id}`,
        });
      }
    } catch (e) {
      console.error(`[google-classroom-sync] materials fetch threw for ${course.id}:`, e);
    }
  }

  // ── Upsert materials ──────────────────────────────────────────────────────
  try {
    for (let i = 0; i < materialRows.length; i += CHUNK) {
      const { error: matError } = await supabase
        .from("course_materials")
        .upsert(materialRows.slice(i, i + CHUNK), { onConflict: "user_id,external_id" });
      if (matError) {
        console.error("[google-classroom-sync] materials upsert error:", matError);
      }
    }
  } catch (e) {
    console.error("[google-classroom-sync] materials upsert threw:", e);
  }

  return json({ ok: true, courses: courses.length, tasks: totalTasks, materials: materialRows.length });
});
