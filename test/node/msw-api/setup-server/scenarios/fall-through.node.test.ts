/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const log = jest.fn()

const server = setupServer(
  http.get('https://test.mswjs.io/*', () => log('[get] first')),
  http.get('https://test.mswjs.io/us*', () => log('[get] second')),
  http.get('https://test.mswjs.io/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  http.get('https://test.mswjs.io/user', () => log('[get] third')),

  http.post('https://test.mswjs.io/blog/*', () => log('[post] first')),
  http.post('https://test.mswjs.io/blog/article', () => log('[post] second')),
)

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  jest.resetAllMocks()
})

afterAll(() => {
  server.close()
})

test('falls through all relevant request handlers until response is returned', async () => {
  const res = await fetch('https://test.mswjs.io/user')
  const body = await res.json()

  expect(body).toEqual({
    firstName: 'John',
  })
  expect(log).toHaveBeenNthCalledWith(1, '[get] first')
  expect(log).toHaveBeenNthCalledWith(2, '[get] second')
  expect(log).not.toBeCalledWith('[get] third')
})

test('falls through all relevant handlers even if none return response', async () => {
  const res = await fetch('https://test.mswjs.io/blog/article', {
    method: 'POST',
  })
  const { status } = res

  expect(status).toBe(404)
  expect(log).toHaveBeenNthCalledWith(1, '[post] first')
  expect(log).toHaveBeenNthCalledWith(2, '[post] second')
})
