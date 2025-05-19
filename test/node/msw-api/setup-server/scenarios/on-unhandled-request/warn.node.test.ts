// @vitest-environment node
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

test('warns on unhandled request when using the "warn" strategy', async () => {
  await fetch('https://test.mswjs.io/user')

  expect(console.warn).toBeCalledWith(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET https://test.mswjs.io/user

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
})

test('ignores common static assets when using the "warn" strategy', async () => {
  await fetch('https://example.com/styles/main.css')

  expect(console.warn).not.toHaveBeenCalled()
})
