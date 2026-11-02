import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { request } from "./client.js";
import { mockFetch } from "../test/utils.jsx";

beforeEach(() => {
  vi.stubEnv("VITE_API_URL", "http://localhost:3001/api");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test("sends Authorization header when token is in localStorage", async () => {
  localStorage.setItem("studytrack.token", "jwt-abc");
  const fetchMock = mockFetch({ "/tasks": { body: [{ id: "t1" }] } });
  vi.stubGlobal("fetch", fetchMock);

  const data = await request("/tasks");

  expect(data).toEqual([{ id: "t1" }]);
  expect(fetchMock.calls[0].url).toBe("http://localhost:3001/api/tasks");
  expect(fetchMock.calls[0].headers.Authorization).toBe("Bearer jwt-abc");
});

test("does not send Authorization when no token", async () => {
  const fetchMock = mockFetch({ "/auth/login": { body: { token: "x" } } });
  vi.stubGlobal("fetch", fetchMock);

  await request("/auth/login", { method: "POST", body: { email: "a@b.c" }, token: null });

  expect(fetchMock.calls[0].headers.Authorization).toBeUndefined();
  expect(fetchMock.calls[0].body).toBe(JSON.stringify({ email: "a@b.c" }));
});

test("throws ApiError with server message", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({ "/auth/login": { status: 401, body: { message: "Невірний email або пароль" } } }),
  );

  await expect(request("/auth/login", { method: "POST", token: null })).rejects.toMatchObject({
    name: "ApiError",
    message: "Невірний email або пароль",
    status: 401,
  });
});

test("returns null for 204 No Content", async () => {
  const fetchMock = mockFetch({ "/tasks/t1": { status: 204, body: null } });
  vi.stubGlobal("fetch", fetchMock);

  const data = await request("/tasks/t1", { method: "DELETE" });

  expect(data).toBeNull();
});
