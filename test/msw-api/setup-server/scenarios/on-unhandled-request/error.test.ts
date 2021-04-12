/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('https://test.mswjs.io/user', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
  rest.post('https://test.mswjs.io/explicit-return', () => {
    // Short-circuiting in a handler makes it perform the request as-is,
    // but still treats this request as handled.
    return
  }),
  rest.post('https://test.mswjs.io/implicit-return', () => {
    // The handler that has no return also performs the request as-is,
    // still treating this request as handled.
  }),
)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  jest.spyOn(global.console, 'error').mockImplementation()
  jest.spyOn(global.console, 'warn').mockImplementation()
})

afterEach(() => {
  jest.resetAllMocks()
})

afterAll(() => {
  jest.restoreAllMocks()
  server.close()
})

test('errors on unhandled request when using the "error" value', async () => {
  const makeRequest = () => fetch('https://test.mswjs.io')
  await makeRequest()

  expect(console.error)
    .toHaveBeenCalledWith(`[MSW] Error: captured a request without a matching request handler:

  • GET https://test.mswjs.io/

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
  expect(console.warn).not.toHaveBeenCalled()
})

test('does not error on request which handler explicitly returns no mocked response', async () => {
  const makeRequest = () =>
    fetch('https://test.mswjs.io/explicit-return', { method: 'POST' })
  await makeRequest()

  expect(console.error).not.toHaveBeenCalled()
})

test('does not error on request which handler implicitly returns no mocked response', async () => {
  const makeRequest = () =>
    fetch('https://test.mswjs.io/implicit-return', { method: 'POST' })
  await makeRequest()

  expect(console.error).not.toHaveBeenCalled()
})
