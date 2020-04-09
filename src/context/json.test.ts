import { json } from './json'
import { response } from '../response'

describe('json', () => {
  describe('given a JSON body', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(json({ firstName: 'John' }))
    })

    it('should have "Content-Type" as "application/json"', () => {
      expect(result.headers.get('content-type')).toEqual('application/json')
    })

    it('should have body set to the given JSON', () => {
      expect(result).toHaveProperty('body', `{"firstName":"John"}`)
    })
  })
})
