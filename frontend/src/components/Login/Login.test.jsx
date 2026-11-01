import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mockFetch, renderApp } from "../../test/utils.jsx";

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("renders login heading", async () => {
  renderApp("/login");
  expect(await screen.findByText("Повернись до своїх цілей.")).toBeTruthy();
});

test("switches to registration form", async () => {
  const user = userEvent.setup();
  renderApp("/login");
  await user.click(await screen.findByRole("button", { name: "Зареєструватися" }));
  expect(screen.getByText("Створити акаунт")).toBeTruthy();
});

test("shows server error for wrong credentials", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({
      "grant_type=password": {
        status: 400,
        body: { error_description: "Invalid login credentials" },
      },
    }),
  );
  const user = userEvent.setup();
  renderApp("/login");

  await user.type(await screen.findByLabelText("Email"), "a@b.c");
  await user.type(screen.getByLabelText("Пароль"), "wrong123");
  await user.click(screen.getByRole("button", { name: "Увійти" }));

  expect(await screen.findByText("Invalid login credentials")).toBeTruthy();
});

test("successful login opens tasks page", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({
      "grant_type=password": {
        body: {
          access_token: "jwt",
          refresh_token: "r",
          expires_in: 3600,
          user: { id: "u1", email: "a@b.c" },
        },
      },
      "/rest/v1/": { body: [] },
    }),
  );
  const user = userEvent.setup();
  const router = renderApp("/login");

  await user.type(await screen.findByLabelText("Email"), "a@b.c");
  await user.type(screen.getByLabelText("Пароль"), "secret123");
  await user.click(screen.getByRole("button", { name: "Увійти" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Завдання" })).toBeTruthy();
  expect(router.state.location.pathname).toBe("/tasks");
});
