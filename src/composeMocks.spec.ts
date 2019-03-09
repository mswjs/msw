import composeMocks from './composeMocks'
import rest from './handlers/rest'

test('Generates schema based on provided handlers', () => {
  const simpleResolver = (req, res, { json }) => res(json({ a: 2 }))
  const match = () => null

  const payload = composeMocks(
    rest.get('https://api.github.com/users/:username', simpleResolver),
    rest.get('foo', simpleResolver),
    rest.post(/footer/, simpleResolver),
  )

  expect(payload).toHaveProperty('start')
  expect(payload.start).toBeInstanceOf(Function)
  expect(payload).toHaveProperty('stop')
  expect(payload.stop).toBeInstanceOf(Function)

  expect(payload.schema).not.toBeUndefined()

  expect(payload.schema).toHaveProperty('get')
  expect(payload.schema.get).toHaveLength(2)
  expect(payload.schema.get[0]).toHaveProperty(
    'mask',
    'https://api.github.com/users/:username',
  )
  expect(payload.schema.get[0]).toHaveProperty('match')
  expect(payload.schema.get[0].match).toBeInstanceOf(Function)
  expect(payload.schema.get[0]).toHaveProperty('resolver')
  expect(payload.schema.get[0].resolver).toBeInstanceOf(Function)
  expect(payload.schema.get[1]).toHaveProperty('mask', 'foo')
  expect(payload.schema.get[1]).toHaveProperty('match')
  expect(payload.schema.get[1].match).toBeInstanceOf(Function)
  expect(payload.schema.get[1]).toHaveProperty('resolver')
  expect(payload.schema.get[1].resolver).toBeInstanceOf(Function)

  expect(payload.schema.post).toHaveLength(1)
  expect(payload.schema.post[0]).toHaveProperty('mask', /footer/)
  expect(payload.schema.post[0]).toHaveProperty('match')
  expect(payload.schema.post[0].match).toBeInstanceOf(Function)
  expect(payload.schema.post[0]).toHaveProperty('resolver')
  expect(payload.schema.post[0].resolver).toBeInstanceOf(Function)
})
