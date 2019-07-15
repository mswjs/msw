import composeMocks from './composeMocks'
import rest from './handlers/rest'

test('Generates schema based on provided handlers', () => {
  const jsonResolver = (req, res, { json }) => res(json({ a: 2 }))

  const mocks = composeMocks(
    rest.get('https://api.github.com/users/:username', jsonResolver),
    rest.get('foo', jsonResolver),
    rest.post(/footer/, jsonResolver),
  )

  expect(mocks).toHaveProperty('start')
  expect(mocks.start).toBeInstanceOf(Function)
  expect(mocks).toHaveProperty('stop')
  expect(mocks.stop).toBeInstanceOf(Function)

  expect(mocks.schema).not.toBeUndefined()

  expect(mocks.schema).toHaveProperty('get')
  expect(mocks.schema.get).toHaveLength(2)
  expect(mocks.schema.get[0]).toHaveProperty(
    'mask',
    'https://api.github.com/users/:username',
  )
  expect(mocks.schema.get[0]).toHaveProperty('match')
  expect(mocks.schema.get[0].match).toBeInstanceOf(Function)
  expect(mocks.schema.get[0]).toHaveProperty('resolver')
  expect(mocks.schema.get[0].resolver).toBeInstanceOf(Function)
  expect(mocks.schema.get[1]).toHaveProperty('mask', 'foo')
  expect(mocks.schema.get[1]).toHaveProperty('match')
  expect(mocks.schema.get[1].match).toBeInstanceOf(Function)
  expect(mocks.schema.get[1]).toHaveProperty('resolver')
  expect(mocks.schema.get[1].resolver).toBeInstanceOf(Function)

  expect(mocks.schema.post).toHaveLength(1)
  expect(mocks.schema.post[0]).toHaveProperty('mask', /footer/)
  expect(mocks.schema.post[0]).toHaveProperty('match')
  expect(mocks.schema.post[0].match).toBeInstanceOf(Function)
  expect(mocks.schema.post[0]).toHaveProperty('resolver')
  expect(mocks.schema.post[0].resolver).toBeInstanceOf(Function)
})
