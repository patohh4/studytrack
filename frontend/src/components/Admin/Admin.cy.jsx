import Admin from './Admin'

describe('<Admin />', () => {
  it('shows the page title and section cards', () => {
    cy.mount(<Admin />)
    cy.contains('Огляд системи').should('be.visible')
    cy.contains('Користувачі').should('be.visible')
    cy.contains('Курси').should('be.visible')
  })
})
