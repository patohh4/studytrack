describe("StudyTrack routing", () => {
  it("shows the login page", () => {
    cy.visit("/login");
    cy.contains("h1", "Повернись до своїх цілей.");
  });

  it("logs in (UI only) and opens tasks", () => {
    cy.visit("/login");
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/tasks");
    cy.contains("h1", "Завдання");
  });

  it("navigates between pages via the sidebar", () => {
    cy.visit("/tasks");
    cy.contains("a", "Календар").click();
    cy.url().should("include", "/calendar");
    cy.contains("a", "Курси").click();
    cy.url().should("include", "/courses");
  });

  it("opens task details and goes back", () => {
    cy.visit("/tasks");
    cy.contains("a", "Лабораторна №4: верстка").click();
    cy.url().should("match", /\/tasks\/2$/);
    cy.contains("h1", "Лабораторна №4: верстка");
    cy.contains("a", "До списку завдань").click();
    cy.url().should("match", /\/tasks$/);
  });

  it("shows 404 page for unknown address", () => {
    cy.visit("/nowhere");
    cy.contains("h1", "Сторінку не знайдено");
  });
});
