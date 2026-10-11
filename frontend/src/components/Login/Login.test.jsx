import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import Login from "./Login.jsx";

test("renders login heading", () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  expect(screen.getByText("Повернись до своїх цілей.")).toBeTruthy();
});

test("switches to registration form", () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Зареєструватися" }));
  expect(screen.getByText("Створити акаунт")).toBeTruthy();
});
