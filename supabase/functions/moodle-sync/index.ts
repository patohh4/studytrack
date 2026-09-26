import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Only POST is supported" }, 405);
  }

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

  const body = await request.json().catch(() => ({}));
  const { data: savedConnection } = await supabase
    .from("moodle_connections")
    .select("base_url, token")
    .eq("user_id", user.id)
    .maybeSingle();
  const moodleBaseUrl = String(body.baseUrl || savedConnection?.base_url || "").replace(/\/$/, "");
  const moodleToken = String(body.token || savedConnection?.token || "");
  if (!moodleBaseUrl || !moodleToken) return json({ error: "Moodle is not connected" }, 400);

  const callMoodle = async (wsfunction: string, params: Record<string, string | number>) => {
    const url = new URL(`${moodleBaseUrl}/webservice/rest/server.php`);
    url.searchParams.set("wstoken", moodleToken);
    url.searchParams.set("wsfunction", wsfunction);
    url.searchParams.set("moodlewsrestformat", "json");
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const response = await fetch(url);
    const result = await response.json();
    if (!response.ok || result.exception) throw new Error(result.message ?? `Moodle request failed (${response.status})`);
    return result;
  };

  let siteInfo;
  let moodleCourses;
  let assignments = [];
  try {
    siteInfo = await callMoodle("core_webservice_get_site_info", {});
    moodleCourses = await callMoodle("core_enrol_get_users_courses", { userid: siteInfo.userid });
    const assignmentResults = await Promise.all((moodleCourses ?? []).map((course: { id: number }) =>
      callMoodle("mod_assign_get_assignments", { "courseids[0]": course.id }).catch(() => ({ courses: [] }))));
    assignments = assignmentResults.flatMap((result) => result.courses?.flatMap((course: { assignments?: unknown[] }) => course.assignments ?? []) ?? []);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Moodle connection failed" }, 502);
  }

  const { error: saveConnectionError } = await supabase.from("moodle_connections").upsert({
    user_id: user.id,
    base_url: moodleBaseUrl,
    token: moodleToken,
    external_user_id: String(siteInfo.userid),
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (saveConnectionError) return json({ error: saveConnectionError.message }, 500);

  for (const course of moodleCourses ?? []) {
    const { error } = await supabase.from("courses").upsert({
      user_id: user.id,
      name: course.fullname ?? course.shortname ?? `Course ${course.id}`,
      color: "gray",
      source: "moodle",
      external_id: String(course.id),
    }, { onConflict: "user_id,source,external_id" });
    if (error) return json({ error: error.message }, 500);
  }

  const { data: savedCourses } = await supabase.from("courses").select("id, external_id").eq("user_id", user.id).eq("source", "moodle");
  for (const assignment of assignments as Array<{ id: number; name: string; duedate?: number; course?: number }>) {
    const course = savedCourses?.find((item) => item.external_id === String(assignment.course));
    if (!course) continue;
    await supabase.from("tasks").upsert({
      user_id: user.id,
      course_id: course.id,
      title: assignment.name,
      description: null,
      due_at: assignment.duedate ? new Date(assignment.duedate * 1000).toISOString() : null,
      source: "moodle",
      external_id: String(assignment.id),
    }, { onConflict: "user_id,source,external_id" });
  }

  return json({
    ok: true,
    userId: user.id,
    moodleBaseUrl,
    synced: true,
    courses: moodleCourses?.length ?? 0,
    assignments: assignments.length,
  });
});
