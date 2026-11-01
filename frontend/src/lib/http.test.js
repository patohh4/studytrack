import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ApiError, request } from "./http.js";
import { mockFetch } from "../test/utils.jsx";

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("sends apikey and user token", async () => {
  const fetchMock = mockFetch({ "/rest/v1/tasks": { body: [{ id: 1 }] } });
  vi.stubGlobal("fetch", fetchMock);

  const data = await request("/rest/v1/tasks", { token: "jwt" });

  expect(data).toEqual([{ id: 1 }]);
  expect(fetchMock.calls[0].url).toBe("https://test.supabase.co/rest/v1/tasks");
  expect(fetchMock.calls[0].headers.apikey).toBe("anon-key");
  expect(fetchMock.calls[0].headers.Authorization).toBe("Bearer jwt");
});

test("uses anon key when there is no token", async () => {
  const fetchMock = mockFetch({ "/auth": { body: {} } });
  vi.stubGlobal("fetch", fetchMock);

  await request("/auth/v1/signup", { method: "POST", body: { email: "a@b.c" } });

  expect(fetchMock.calls[0].headers.Authorization).toBe("Bearer anon-key");
  expect(fetchMock.calls[0].body).toBe(JSON.stringify({ email: "a@b.c" }));
});

test("throws ApiError with server message", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({
      "/auth": { status: 400, body: { error_description: "Invalid login credentials" } },
    }),
  );

  await expect(request("/auth/v1/token")).rejects.toMatchObject({
    name: "ApiError",
    message: "Invalid login credentials",
    status: 400,
  });
});

test("throws when Supabase is not configured", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "");
  await expect(request("/rest/v1/tasks")).rejects.toBeInstanceOf(ApiError);
});
