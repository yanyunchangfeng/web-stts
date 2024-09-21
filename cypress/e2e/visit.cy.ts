interface IVisit {
  id: string;
  icon: string;
}

describe('test visit / ', () => {
  beforeEach(() => {
    cy.fixture('visit').as('visit');
    cy.visit('/');
  });
  it('get div id correct', () => {
    cy.get<IVisit>('@visit').then((visit) => {
      cy.get('div').should('have.id', visit.id);
    });
  });
  it('get link icon correct', () => {
    cy.get<IVisit>('@visit').then((visit) => {
      cy.get("link[rel='icon']").should('have.attr', 'href', visit.icon);
    });
  });
});
