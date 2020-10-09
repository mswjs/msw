import { json } from './json'
import { response } from '../response'

describe('json', () => {
  describe('given a JSON body', () => {
    it('should have "Content-Type" as "application/json"', () => {
      const result = response(json({ firstName: 'John' }))

      expect(result.headers.get('content-type')).toEqual('application/json')
    })

    it('should have body set to the given JSON', () => {
      const object = json({ firstName: 'John' })

      expect(response(object)).toHaveProperty('body', `{"firstName":"John"}`)

      const array = json([1, '2', true, { ok: true }, ''])

      expect(response(array)).toHaveProperty(
        'body',
        '[1,"2",true,{"ok":true},""]',
      )

      const string = json('Some string')

      expect(response(string)).toHaveProperty('body', '"Some string"')

      const bool = json(true)

      expect(response(bool)).toHaveProperty('body', 'true')

      const date = json(new Date(Date.UTC(2020, 0, 1)))

      expect(response(date)).toHaveProperty(
        'body',
        '"2020-01-01T00:00:00.000Z"',
      )
    })

    it('should allow merging with a prior body', () => {
      const firstNonNestedObject = json({ firstName: 'John' }, { merge: true })
      const secondNonNestedObject = json({ lastName: 'Santa' }, { merge: true })

      expect(
        response(firstNonNestedObject, secondNonNestedObject),
      ).toHaveProperty('body', '{"firstName":"John","lastName":"Santa"}')

      const firstNestedObject = json(
        { john: { street: 'Doe street', number: 74 } },
        { merge: true },
      )
      const secondNestedObject = json(
        { john: { street: 'Doe street' } },
        { merge: true },
      )

      expect(response(firstNestedObject, secondNestedObject)).toHaveProperty(
        'body',
        '{"john":{"street":"Doe street","number":74}}',
      )
    })
  })
})
