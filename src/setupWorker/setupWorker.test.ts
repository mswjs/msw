import { setupWorker } from './setupWorker'
import { rest, restContext } from '../rest'
import { MockedRequest, ResponseResolver } from '../handlers/requestHandler'
const simpleResolver: ResponseResolver<MockedRequest, typeof restContext> = (
  req,
  res,
  { json },
) => {
  return res(json({ a: 2 }))
}

test('Generates schema based on provided handlers', () => {
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

test('should show a warning if the user try to mock api whit query params', () => {
  const spy = jest
    .spyOn(console, 'warn')
    .mockImplementationOnce((message) => message)
  const simpleResolver: ResponseResolver<MockedRequest, typeof restContext> = (
    req,
    res,
    { json },
  ) => {
    return res(json({ a: 2 }))
  }

  setupWorker(
    rest.get('https://test.mswjs.io/api/libraries?size=10', simpleResolver),
  )

  expect(console.warn).toHaveBeenCalled()
  spy.mockClear()
})
