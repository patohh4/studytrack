describe("StudyTrack login", () => {
  it("shows the login page for an unauthenticated user", () => {
    cy.visit("/");
    cy.contains("h1", "Повернись до своїх цілей.");
  });

  it("shows an error when submitting an empty form", () => {
    cy.visit("/");
    cy.get('button[type="submit"]').click();
    cy.contains("Supabase ще не налаштований");
  });
});
