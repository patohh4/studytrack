import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect, test } from "vitest";
import { routes } from "./routes.jsx";

const renderAt = (path) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

const heading = (name) => screen.getByRole("heading", { level: 1, name });

test("shows login page", () => {
  renderAt("/login");
  expect(heading("Повернись до своїх цілей.")).toBeTruthy();
});

test("redirects / to tasks", () => {
  const router = renderAt("/");
  expect(router.state.location.pathname).toBe("/tasks");
  expect(heading("Завдання")).toBeTruthy();
});

test.each([
  ["/tasks", "Завдання"],
  ["/calendar", "Жовтень 2026"],
  ["/courses", "Курси"],
])("renders %s page", (path, title) => {
  renderAt(path);
  expect(heading(title)).toBeTruthy();
});

test("renders task details by id param", () => {
  renderAt("/tasks/2");
  expect(heading("Лабораторна №4: верстка")).toBeTruthy();
  expect(screen.getByText("Зверстати сторінки застосунку без CSS-фреймворків.")).toBeTruthy();
});

test("shows message for unknown task", () => {
  renderAt("/tasks/999");
  expect(heading("Завдання не знайдено")).toBeTruthy();
});

test("shows 404 for unknown route", () => {
  renderAt("/nowhere");
  expect(heading("Сторінку не знайдено")).toBeTruthy();
});
