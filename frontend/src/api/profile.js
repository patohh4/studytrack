import { request } from "./client.js";

/** GET /api/profile — профіль поточного користувача */
export function fetchProfile() {
  return request("/profile");
}

/** PATCH /api/profile — оновити профіль */
export function updateProfile(patch) {
  return request("/profile", { method: "PATCH", body: patch });
}
