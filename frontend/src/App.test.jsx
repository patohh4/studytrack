import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import App from "./App.jsx";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

test("redirects unknown route to login", () => {
  renderAt("/nowhere");
  expect(screen.getByText("Повернись до своїх цілей.")).toBeTruthy();
});

test.each([
  ["/tasks", "Завдання", "heading"],
  ["/calendar", "Жовтень 2026", "heading"],
  ["/courses", "Курси", "heading"],
])("renders %s page", (path, title) => {
  renderAt(path);
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
});
