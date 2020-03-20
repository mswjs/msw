import { composeMocks } from './composeMocks'
import rest, { restContext } from './handlers/rest'
import { ResponseResolver } from './handlers/requestHandler'

test('Generates schema based on provided handlers', () => {
  const simpleResolver: ResponseResolver<typeof restContext> = (
    req,
    res,
    { json },
  ) => res(json({ a: 2 }))

  const payload = composeMocks(
    rest.get('https://api.github.com/users/:username', simpleResolver),
    rest.get('foo', simpleResolver),
    rest.post(/footer/, simpleResolver),
  )

  expect(payload).toHaveProperty('start')
  expect(payload.start).toBeInstanceOf(Function)
  expect(payload).toHaveProperty('stop')
  expect(payload.stop).toBeInstanceOf(Function)
})
