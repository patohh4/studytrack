import { request } from "./client.js";

/** GET /api/tasks — список завдань */
export function fetchTasks() {
  return request("/tasks");
}

/** POST /api/tasks — створити завдання */
export function createTask(task) {
  return request("/tasks", { method: "POST", body: task });
}

/** PATCH /api/tasks/:id — оновити завдання */
export function updateTask(id, patch) {
  return request(`/tasks/${id}`, { method: "PATCH", body: patch });
}

/** DELETE /api/tasks/:id — видалити завдання */
export function deleteTask(id) {
  return request(`/tasks/${id}`, { method: "DELETE" });
}
