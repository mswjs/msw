/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const log = jest.fn()

const server = setupServer(
  rest.get('https://test.mswjs.io/*', () => log('[get] first')),
  rest.get('https://test.mswjs.io/us*', () => log('[get] second')),
  rest.get('https://test.mswjs.io/user', (req, res, ctx) =>
    res(ctx.json({ firstName: 'John' })),
  ),
  rest.get('https://test.mswjs.io/user', () => log('[get] third')),

  rest.post('https://test.mswjs.io/blog/*', () => log('[post] first')),
  rest.post('https://test.mswjs.io/blog/article', () => log('[post] second')),
)

beforeAll(() => {
  // Supress the "Expeted mocking resolver function to return a mocked response" warnings.
  jest.spyOn(global.console, 'warn').mockImplementation()
  server.listen()
})

afterAll(() => {
  jest.restoreAllMocks()
  server.close()
})

test('falls through all relevant request handlers until response is returned', async () => {
  const res = await fetch('https://test.mswjs.io/user')
  const body = await res.json()

  expect(body).toEqual({
    firstName: 'John',
  })
  expect(log).toBeCalledWith('[get] first')
  expect(log).toBeCalledWith('[get] second')
  expect(log).not.toBeCalledWith('[get] third')
})

test('falls through all relevant handlers even if none return response', async () => {
  const res = await fetch('https://test.mswjs.io/blog/article', {
    method: 'POST',
  })
  const { status } = res

  expect(status).toBe(404)
  expect(log).toBeCalledWith('[post] first')
  expect(log).toBeCalledWith('[post] second')
})
