// @vitest-environment node
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'
import { HttpNetworkFrame } from 'msw/experimental'

const server = setupServer(
  http.get('https://test.mswjs.io/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

const unhandledListener = vi.fn()

beforeAll(() => {
  server.listen({
    onUnhandledFrame: unhandledListener,
  })
})

afterEach(() => {
  vi.clearAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('invokes the callback for an unhandled request', async () => {
  const response = await fetch('https://test.mswjs.io')

  // Request should be performed as-is, since the callback didn't throw.
  expect(response).toHaveProperty('status', 404)
  expect(unhandledListener).toHaveBeenCalledTimes(1)

  const [{ frame, defaults }] = unhandledListener.mock.calls[0]
  expect(frame).toBeInstanceOf(HttpNetworkFrame)
  expect.soft(frame.data.request.method).toBe('GET')
  expect.soft(frame.data.request.url).toBe('https://test.mswjs.io/')
  expect.soft(defaults).toEqual({
    warn: expect.any(Function),
    error: expect.any(Function),
  })
})
