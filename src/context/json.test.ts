import { json } from './json'
import { response } from '../response'
import { assertHeader } from '../utils/assertHeader'

describe('json', () => {
  describe('given a JSON body', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(json({ firstName: 'John' }))
    })

    it('should have "Content-Type" as "application/json"', () => {
      assertHeader(result.headers, 'Content-Type', 'application/json')
    })

    it('should have body set to the given JSON', () => {
      expect(result).toHaveProperty('body', `{"firstName":"John"}`)
    })
  })
})
