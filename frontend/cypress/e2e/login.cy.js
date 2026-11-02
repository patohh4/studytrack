const API = "http://localhost:3001/api";

const TOKEN = "e2e-token";
const USER = { id: "user-1", name: "Стас", email: "stas@uzhnu.edu.ua" };

const tasks = [
  {
    id: "t1",
    title: "Лабораторна №7",
    description: "Реалізувати Express API",
    dueDate: "2030-01-10T10:00:00Z",
    status: "todo",
    completedAt: null,
    courseId: null,
  },
];

describe("StudyTrack", () => {
  beforeEach(() => {
    cy.intercept("GET", `${API}/tasks*`, { body: tasks });
    cy.intercept("GET", `${API}/courses*`, { body: [] });
  });

  it("redirects guests to the login page", () => {
    cy.visit("/tasks");
    cy.url().should("include", "/login");
    cy.contains("h1", "Повернись до своїх цілей.");
  });

  it("shows server error for wrong credentials", () => {
    cy.intercept("POST", `${API}/auth/login`, {
      statusCode: 401,
      body: { message: "Невірний email або пароль" },
    });
    cy.visit("/login");
    cy.get('input[type="email"]').type("stas@uzhnu.edu.ua");
    cy.get('input[type="password"]').type("wrong-password");
    cy.get('button[type="submit"]').click();
    cy.contains("Невірний email або пароль");
  });

  it("logs in, shows tasks and opens task details", () => {
    cy.intercept("POST", `${API}/auth/login`, { body: { token: TOKEN, user: USER } });
    cy.visit("/login");
    cy.get('input[type="email"]').type("stas@uzhnu.edu.ua");
    cy.get('input[type="password"]').type("secret123");
    cy.get('button[type="submit"]').click();

    cy.url().should("include", "/tasks");
    cy.contains("a", "Лабораторна №7").click();
    cy.url().should("include", "/tasks/t1");
    cy.contains("h1", "Лабораторна №7");
  });

  it("shows 404 page for unknown address", () => {
    cy.visit("/nowhere");
    cy.contains("h1", "Сторінку не знайдено");
  });
});
