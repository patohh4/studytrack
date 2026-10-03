describe('Login page', () => {
  it('opens the app', () => {
    cy.visit('/')
    cy.get('body').should('be.visible')
  })
})
