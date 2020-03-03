import { data } from './data'
import { response } from '../response'
import { assertHeader } from '../utils/assertHeader'

describe('data', () => {
  describe('given a JSON data', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(data({ name: 'msw' }))
    })

    it('should have "Content-Type" as "application/json"', () => {
      assertHeader(result.headers, 'Content-Type', 'application/json')
    })

    it('should have body set to the given JSON nested in the "data" property', () => {
      expect(result).toHaveProperty('body', `{"data":{"name":"msw"}}`)
    })
  })
})
