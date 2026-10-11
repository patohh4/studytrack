describe("StudyTrack navigation", () => {
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
    cy.contains("h1", "Жовтень 2026");
    cy.contains("a", "Курси").click();
    cy.contains("h1", "Курси");
  });
});
