const API = "https://e2e.supabase.test";

const session = {
  access_token: "e2e-token",
  refresh_token: "e2e-refresh",
  expires_in: 3600,
  user: { id: "user-1", email: "stas@uzhnu.edu.ua" },
};

const tasks = [
  {
    id: "t1",
    title: "Лабораторна №6",
    description: "Реалізувати хуки",
    due_at: "2030-01-10T10:00:00Z",
    completed_at: null,
    course_id: null,
    courses: null,
  },
];

describe("StudyTrack", () => {
  beforeEach(() => {
    cy.intercept("GET", `${API}/rest/v1/tasks*`, { body: tasks });
    cy.intercept("GET", `${API}/rest/v1/courses*`, { body: [] });
  });

  it("redirects guests to the login page", () => {
    cy.visit("/tasks");
    cy.url().should("include", "/login");
    cy.contains("h1", "Повернись до своїх цілей.");
  });

  it("shows server error for wrong credentials", () => {
    cy.intercept("POST", `${API}/auth/v1/token*`, {
      statusCode: 400,
      body: { error_description: "Invalid login credentials" },
    });
    cy.visit("/login");
    cy.get('input[type="email"]').type("stas@uzhnu.edu.ua");
    cy.get('input[type="password"]').type("wrong-password");
    cy.get('button[type="submit"]').click();
    cy.contains("Invalid login credentials");
  });

  it("logs in, shows tasks and opens task details", () => {
    cy.intercept("POST", `${API}/auth/v1/token*`, { body: session });
    cy.visit("/login");
    cy.get('input[type="email"]').type("stas@uzhnu.edu.ua");
    cy.get('input[type="password"]').type("secret123");
    cy.get('button[type="submit"]').click();

    cy.url().should("include", "/tasks");
    cy.contains("a", "Лабораторна №6").click();
    cy.url().should("include", "/tasks/t1");
    cy.contains("h1", "Лабораторна №6");
  });

  it("shows 404 page for unknown address", () => {
    cy.visit("/nowhere");
    cy.contains("h1", "Сторінку не знайдено");
  });
});
