import composeMocks from './composeMocks'
import rest from './handlers/rest'

describe('composeMocks', () => {
  let mocks = null

  beforeAll(() => {
    const responseResolver = (req, res, { json }) => {
      return res(json({ a: 2 }))
    }

    mocks = composeMocks(
      rest.get('foo', responseResolver),
      rest.get('https://api.github.com/users/:username', responseResolver),
      rest.post(/footer/, responseResolver),
    )
  })

  describe('Public API', () => {
    const publicProps = { start: Function, stop: Function }

    Object.keys(publicProps).forEach((propName) => {
      test(`should contain "${propName}"`, () => {
        expect(mocks).toHaveProperty(propName)
        expect(mocks[propName]).toBeInstanceOf(publicProps[propName])
      })
    })
  })

  describe('Schema', () => {
    test('should return a schema', () => {
      expect(mocks).toHaveProperty('schema')
      expect(mocks.schema).not.toBeUndefined()
    })

    describe('get', () => {
      test('should contain 2 mocks', () => {
        expect(mocks.schema.get).toHaveLength(2)
      })

      describe('plain string mask', () => {
        test('should have a string mask value', () => {
          expect(mocks.schema.get[0]).toHaveProperty('mask', 'foo')
        })

        test('should have "match" method', () => {
          expect(mocks.schema.get[0]).toHaveProperty('match')
          expect(mocks.schema.get[0].match).toBeInstanceOf(Function)
        })

        test('should have a resolver', () => {
          expect(mocks.schema.get[0]).toHaveProperty('resolver')
          expect(mocks.schema.get[0].resolver).toBeInstanceOf(Function)
        })
      })

      describe('path string mask', () => {
        test('should have a path mask value', () => {
          expect(mocks.schema.get[1]).toHaveProperty(
            'mask',
            'https://api.github.com/users/:username',
          )
        })

        test('should have a "match" method', () => {
          expect(mocks.schema.get[1]).toHaveProperty('match')
          expect(mocks.schema.get[1].match).toBeInstanceOf(Function)
        })

        test('should have a resolver', () => {
          expect(mocks.schema.get[1]).toHaveProperty('resolver')
          expect(mocks.schema.get[1].resolver).toBeInstanceOf(Function)
        })
      })
    })

    describe('post', () => {
      test('should contain 1 mock', () => {
        expect(mocks.schema.post).toHaveLength(1)
      })

      describe('RegExp mask', () => {
        test('should have a RegExp mask value', () => {
          expect(mocks.schema.post[0]).toHaveProperty('mask', /footer/)
        })

        test('should have a "match" method', () => {
          expect(mocks.schema.post[0]).toHaveProperty('match')
          expect(mocks.schema.post[0].match).toBeInstanceOf(Function)
        })

        test('should have a resolver', () => {
          expect(mocks.schema.post[0]).toHaveProperty('resolver')
          expect(mocks.schema.post[0].resolver).toBeInstanceOf(Function)
        })
      })
    })
  })
})
