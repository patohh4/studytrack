import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useAuth } from "./useAuth.js";
import { Providers, mockFetch } from "../test/utils.jsx";

const authResponse = {
  access_token: "jwt",
  refresh_token: "refresh",
  expires_in: 3600,
  user: { id: "user-1", email: "stas@uzhnu.edu.ua" },
};

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("signIn stores the session", async () => {
  const fetchMock = mockFetch({ "grant_type=password": { body: authResponse } });
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });
  expect(result.current.session).toBeNull();

  await act(() => result.current.signIn("stas@uzhnu.edu.ua", "secret123"));

  expect(result.current.user.email).toBe("stas@uzhnu.edu.ua");
  expect(JSON.parse(fetchMock.calls[0].body)).toEqual({
    email: "stas@uzhnu.edu.ua",
    password: "secret123",
  });
  expect(localStorage.getItem("studytrack.session")).toContain("jwt");
});

test("signIn failure keeps user logged out and throws", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({
      "grant_type=password": {
        status: 400,
        body: { error_description: "Invalid login credentials" },
      },
    }),
  );

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });

  await expect(act(() => result.current.signIn("a@b.c", "wrong"))).rejects.toThrow(
    "Invalid login credentials",
  );
  expect(result.current.session).toBeNull();
});

test("signUp without confirmation asks to confirm email", async () => {
  vi.stubGlobal("fetch", mockFetch({ "/auth/v1/signup": { body: { id: "user-1" } } }));

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });
  let outcome;
  await act(async () => {
    outcome = await result.current.signUp("a@b.c", "secret123", "Стас");
  });

  expect(outcome).toEqual({ needsConfirmation: true });
  expect(result.current.session).toBeNull();
});

test("signOut clears the session even if the server fails", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({
      "grant_type=password": { body: authResponse },
      "/auth/v1/logout": { status: 500, body: { message: "boom" } },
    }),
  );

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });
  await act(() => result.current.signIn("a@b.c", "secret123"));
  await act(() => result.current.signOut());

  await waitFor(() => expect(result.current.session).toBeNull());
  expect(localStorage.getItem("studytrack.session")).toBeNull();
});

test("completeOAuth reads tokens from the url hash", async () => {
  vi.stubGlobal("fetch", mockFetch({ "/auth/v1/user": { body: authResponse.user } }));

  const { result } = renderHook(() => useAuth(), { wrapper: Providers });
  await act(() =>
    result.current.completeOAuth(
      "#access_token=jwt&refresh_token=r&expires_in=3600&token_type=bearer",
    ),
  );

  expect(result.current.session.access_token).toBe("jwt");
  expect(result.current.user.id).toBe("user-1");
});
