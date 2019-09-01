import composeMocks from './composeMocks'
import rest from './handlers/rest'

test('Generates schema based on provided handlers', () => {
  const simpleResolver = (req, res, { json }) => res(json({ a: 2 }))

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

  expect(payload.schema).toHaveProperty('GET')
  expect(payload.schema.GET).toHaveLength(2)
  expect(payload.schema.GET[0]).toHaveProperty(
    'mask',
    'https://api.github.com/users/:username',
  )
  expect(payload.schema.GET[0]).toHaveProperty('match')
  expect(payload.schema.GET[0].match).toBeInstanceOf(Function)
  expect(payload.schema.GET[0]).toHaveProperty('resolver')
  expect(payload.schema.GET[0].resolver).toBeInstanceOf(Function)
  expect(payload.schema.GET[1]).toHaveProperty('mask', 'foo')
  expect(payload.schema.GET[1]).toHaveProperty('match')
  expect(payload.schema.GET[1].match).toBeInstanceOf(Function)
  expect(payload.schema.GET[1]).toHaveProperty('resolver')
  expect(payload.schema.GET[1].resolver).toBeInstanceOf(Function)

  expect(payload.schema.POST).toHaveLength(1)
  expect(payload.schema.POST[0]).toHaveProperty('mask', /footer/)
  expect(payload.schema.POST[0]).toHaveProperty('match')
  expect(payload.schema.POST[0].match).toBeInstanceOf(Function)
  expect(payload.schema.POST[0]).toHaveProperty('resolver')
  expect(payload.schema.POST[0].resolver).toBeInstanceOf(Function)
})
