import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TEST_SESSION, mockFetch, renderApp } from "./test/utils.jsx";

const tasks = [
  {
    id: "t1",
    title: "Лабораторна №6",
    description: "Реалізувати хуки",
    due_at: "2030-01-10T10:00:00Z",
    completed_at: null,
    course_id: "c1",
    courses: { name: "Веб-технології", color: "gray" },
  },
];

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
  vi.stubGlobal(
    "fetch",
    mockFetch({
      "/rest/v1/tasks": { body: tasks },
      "/rest/v1/courses": { body: [{ id: "c1", name: "Веб-технології" }] },
    }),
  );
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const login = () => localStorage.setItem("studytrack.session", JSON.stringify(TEST_SESSION));
const heading = (name) => screen.findByRole("heading", { level: 1, name });

test("redirects guests from protected pages to login", async () => {
  const router = renderApp("/tasks");
  expect(await heading("Повернись до своїх цілей.")).toBeTruthy();
  expect(router.state.location.pathname).toBe("/login");
});

test("logged in user is redirected from login to tasks", async () => {
  login();
  const router = renderApp("/login");
  expect(await heading("Завдання")).toBeTruthy();
  expect(router.state.location.pathname).toBe("/tasks");
});

test("shows tasks loaded from the server", async () => {
  login();
  renderApp("/tasks");
  expect(await screen.findByText("Лабораторна №6")).toBeTruthy();
  expect(screen.getByText("Веб-технології")).toBeTruthy();
});

test("renders task details by id param", async () => {
  login();
  renderApp("/tasks/t1");
  expect(await heading("Лабораторна №6")).toBeTruthy();
  expect(screen.getByText("Реалізувати хуки")).toBeTruthy();
});

test("shows message for unknown task", async () => {
  login();
  renderApp("/tasks/unknown");
  expect(await heading("Завдання не знайдено")).toBeTruthy();
});

test("renders courses page with server data", async () => {
  login();
  renderApp("/courses");
  expect(await heading("Курси")).toBeTruthy();
  expect(await screen.findByText("Веб-технології")).toBeTruthy();
});

test("renders calendar page", async () => {
  login();
  renderApp("/calendar");
  expect(await screen.findByRole("heading", { level: 1, name: /\d{4}$/ })).toBeTruthy();
});

test("shows 404 for unknown route", async () => {
  renderApp("/nowhere");
  expect(await heading("Сторінку не знайдено")).toBeTruthy();
});

test("creates a task from the form", async () => {
  login();
  const user = userEvent.setup();
  renderApp("/tasks");

  await screen.findByText("Лабораторна №6");
  await user.click(screen.getByRole("button", { name: /Нове завдання/ }));
  await user.type(screen.getByLabelText("Назва"), "Нова задача");
  await user.click(screen.getByRole("button", { name: "Додати завдання" }));

  await waitFor(() => {
    const post = fetch.calls.find((c) => c.method === "POST");
    expect(JSON.parse(post.body).title).toBe("Нова задача");
  });
});
