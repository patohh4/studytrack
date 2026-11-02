import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useAuth } from "./useAuth.js";
import { Providers, mockFetch, TEST_TOKEN, TEST_USER } from "../test/utils.jsx";

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_URL", "http://localhost:3001/api");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test("signIn stores the user and token", async () => {
  const fetchMock = mockFetch({
    "/auth/login": { body: { token: TEST_TOKEN, user: TEST_USER } },
  });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });
  expect(result.current.user).toBeNull();

  await act(() => result.current.signIn("stas@uzhnu.edu.ua", "secret123"));

  expect(result.current.user.email).toBe("stas@uzhnu.edu.ua");
  expect(JSON.parse(fetchMock.calls[0].body)).toEqual({
    email: "stas@uzhnu.edu.ua",
    password: "secret123",
  });
  expect(localStorage.getItem("studytrack.token")).toBe(TEST_TOKEN);
});

test("signIn failure keeps user logged out and throws", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({
      "/auth/login": { status: 401, body: { message: "Невірний email або пароль" } },
    }),
  );

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });

  await expect(act(() => result.current.signIn("a@b.c", "wrong"))).rejects.toThrow(
    "Невірний email або пароль",
  );
  expect(result.current.user).toBeNull();
  expect(localStorage.getItem("studytrack.token")).toBeNull();
});

test("signUp stores the user and token", async () => {
  const fetchMock = mockFetch({
    "/auth/register": { body: { token: TEST_TOKEN, user: TEST_USER } },
  });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });

  await act(() => result.current.signUp("Стас", "a@b.c", "secret123"));

  expect(result.current.user.name).toBe("Станіслав");
  expect(localStorage.getItem("studytrack.token")).toBe(TEST_TOKEN);
});

test("signOut clears user and token", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({ "/auth/login": { body: { token: TEST_TOKEN, user: TEST_USER } } }),
  );

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });
  await act(() => result.current.signIn("a@b.c", "secret123"));

  act(() => result.current.signOut());

  expect(result.current.user).toBeNull();
  expect(localStorage.getItem("studytrack.token")).toBeNull();
});

test("isAuthenticated reflects token presence", async () => {
  const fetchMock = mockFetch({
    "/auth/login": { body: { token: TEST_TOKEN, user: TEST_USER } },
  });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });
  expect(result.current.isAuthenticated).toBe(false);

  await act(() => result.current.signIn("a@b.c", "secret123"));
  expect(result.current.isAuthenticated).toBe(true);

  act(() => result.current.signOut());
  expect(result.current.isAuthenticated).toBe(false);
});
