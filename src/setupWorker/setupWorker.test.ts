import { setupWorker } from './setupWorker'
import { rest, restContext } from '../rest'
import { MockedRequest, ResponseResolver } from '../handlers/requestHandler'

test('Generates schema based on provided handlers', () => {
  const simpleResolver: ResponseResolver<MockedRequest, typeof restContext> = (
    req,
    res,
    { json },
  ) => {
    return res(json({ a: 2 }))
  }

  const api = setupWorker(
    rest.get('https://api.github.com/users/:username', simpleResolver),
    rest.get('foo', simpleResolver),
    rest.post(/footer/, simpleResolver),
  )

  expect(api).toHaveProperty('start')
  expect(api.start).toBeInstanceOf(Function)
  expect(api).toHaveProperty('stop')
  expect(api.stop).toBeInstanceOf(Function)
})
