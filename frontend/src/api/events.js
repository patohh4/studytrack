import { request } from "./client.js";

/**
 * GET /api/events — події календаря.
 * @param {{ from?: string, to?: string }} [params]
 */
export function fetchEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const qs = query.toString();
  return request(`/events${qs ? `?${qs}` : ""}`);
}
