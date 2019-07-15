import rest from './rest'

const restMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

describe('Handlers: REST', () => {
  describe('exports all REST API methods', () => {
    restMethods.forEach((methodName) => {
      it(methodName, () => {
        expect(rest).toHaveProperty(methodName.toLowerCase())
      })
    })
  })
})
