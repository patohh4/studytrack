import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useCreateTask, useTasks, useToggleTask } from "./useTasks.js";
import { Providers, mockFetch, TEST_TOKEN } from "../test/utils.jsx";

beforeEach(() => {
  localStorage.setItem("studytrack.token", TEST_TOKEN);
  vi.stubEnv("VITE_API_URL", "http://localhost:3001/api");
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("useTasks loads tasks with the user token", async () => {
  const fetchMock = mockFetch({ "/tasks": { body: [{ id: "t1", title: "Лаба" }] } });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useTasks(), { wrapper: Providers });

  await waitFor(() => expect(result.current.data).toHaveLength(1));
  expect(fetchMock.calls[0].headers.Authorization).toBe(`Bearer ${TEST_TOKEN}`);
});

test("useTasks exposes server errors", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({ "/tasks": { status: 401, body: { message: "JWT expired" } } }),
  );

  const { result } = renderHook(() => useTasks(), { wrapper: Providers });

  await waitFor(() => expect(result.current.error?.message).toBe("JWT expired"));
});

test("useCreateTask POSTs the task", async () => {
  const fetchMock = mockFetch({ "/tasks": { body: [{ id: "t2" }] } });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useCreateTask(), { wrapper: Providers });
  await act(() => result.current.mutateAsync({ title: "Нове", dueDate: null, courseId: null }));

  const call = fetchMock.calls[0];
  expect(call.method).toBe("POST");
  expect(JSON.parse(call.body)).toMatchObject({ title: "Нове", dueDate: null });
});

test("useToggleTask PATCHes status to done", async () => {
  const fetchMock = mockFetch({ "/tasks/t1": { body: [{ id: "t1", status: "done" }] } });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useToggleTask(), { wrapper: Providers });
  await act(() => result.current.mutateAsync({ id: "t1", done: true }));

  const call = fetchMock.calls[0];
  expect(call.method).toBe("PATCH");
  expect(call.url).toContain("/tasks/t1");
  expect(JSON.parse(call.body)).toEqual({ status: "done" });
});
