import { json } from './json'
import { response } from '../response'

describe('json', () => {
  describe('given a JSON body', () => {
    it('should have "Content-Type" as "application/json"', () => {
      const result = response(json({ firstName: 'John' }))

      expect(result.headers.get('content-type')).toEqual('application/json')
    })

    it('should have body set to the given JSON', () => {
      const object = response(json({ firstName: 'John' }))

      expect(object).toHaveProperty('body', `{"firstName":"John"}`)

      const array = response(json([1, '2', true, { ok: true }, '']))

      expect(array).toHaveProperty('body', '[1,"2",true,{"ok":true},""]')

      const string = response(json('Some string'))

      expect(string).toHaveProperty('body', '"Some string"')

      const bool = response(json(true))

      expect(bool).toHaveProperty('body', 'true')
    })
  })
})
