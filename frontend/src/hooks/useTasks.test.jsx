import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useCreateTask, useTasks, useToggleTask } from "./useTasks.js";
import { Providers, TEST_SESSION, mockFetch } from "../test/utils.jsx";

beforeEach(() => {
  localStorage.setItem("studytrack.session", JSON.stringify(TEST_SESSION));
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("useTasks loads tasks with the user token", async () => {
  const fetchMock = mockFetch({ "/rest/v1/tasks": { body: [{ id: "t1", title: "Лаба" }] } });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useTasks(), { wrapper: Providers });

  await waitFor(() => expect(result.current.data).toHaveLength(1));
  expect(fetchMock.calls[0].headers.Authorization).toBe("Bearer token-123");
});

test("useTasks exposes server errors", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({ "/rest/v1/tasks": { status: 401, body: { message: "JWT expired" } } }),
  );

  const { result } = renderHook(() => useTasks(), { wrapper: Providers });

  await waitFor(() => expect(result.current.error?.message).toBe("JWT expired"));
});

test("useCreateTask POSTs the task with user_id", async () => {
  const fetchMock = mockFetch({ "/rest/v1/tasks": { body: [{ id: "t2" }] } });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useCreateTask(), { wrapper: Providers });
  await act(() => result.current.mutateAsync({ title: "Нове", dueAt: null, courseId: null }));

  const call = fetchMock.calls[0];
  expect(call.method).toBe("POST");
  expect(JSON.parse(call.body)).toMatchObject({ user_id: "user-1", title: "Нове", due_at: null });
});

test("useToggleTask PATCHes completed_at", async () => {
  const fetchMock = mockFetch({ "/rest/v1/tasks": { body: [{ id: "t1" }] } });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useToggleTask(), { wrapper: Providers });
  await act(() => result.current.mutateAsync({ id: "t1", done: true }));
  await act(() => result.current.mutateAsync({ id: "t1", done: false }));

  const [first, second] = fetchMock.calls.filter((c) => c.method === "PATCH");
  expect(first.url).toContain("id=eq.t1");
  expect(JSON.parse(first.body).completed_at).toEqual(expect.any(String));
  expect(JSON.parse(second.body).completed_at).toBeNull();
});
