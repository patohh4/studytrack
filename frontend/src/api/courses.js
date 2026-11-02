import { request } from "./client.js";

/** GET /api/courses — список курсів */
export function fetchCourses() {
  return request("/courses");
}

/** POST /api/courses — створити курс */
export function createCourse(name) {
  return request("/courses", { method: "POST", body: { name } });
}
