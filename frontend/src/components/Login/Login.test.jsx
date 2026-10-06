import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Login from "./Login.jsx";

test("renders login heading", () => {
  render(<Login onLogin={() => {}} />);
  expect(screen.getByText("Повернись до своїх цілей.")).toBeTruthy();
});
