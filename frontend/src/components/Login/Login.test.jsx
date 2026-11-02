import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mockFetch, renderApp } from "../../test/utils.jsx";

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_URL", "http://localhost:3001/api");
});

afterEach(() => {
  localStorage.clear();
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
      "/auth/login": { status: 401, body: { message: "Невірний email або пароль" } },
    }),
  );
  const user = userEvent.setup();
  renderApp("/login");

  await user.type(await screen.findByLabelText("Email"), "a@b.c");
  await user.type(screen.getByLabelText("Пароль"), "wrong123");
  await user.click(screen.getByRole("button", { name: "Увійти" }));

  expect(await screen.findByText("Невірний email або пароль")).toBeTruthy();
});

test("successful login opens tasks page", async () => {
  vi.stubGlobal(
    "fetch",
    mockFetch({
      "/auth/login": { body: { token: "jwt", user: { id: "u1", name: "Стас", email: "a@b.c" } } },
      "/tasks": { body: [] },
      "/courses": { body: [] },
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
