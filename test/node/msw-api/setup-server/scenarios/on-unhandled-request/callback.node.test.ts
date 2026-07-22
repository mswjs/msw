// @vitest-environment node
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

const server = setupServer(
  http.get('https://test.mswjs.io/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

const unhandledListener = vi.fn()

beforeAll(() => {
  server.listen({
    onUnhandledRequest: unhandledListener,
  })
})

afterEach(() => {
  vi.clearAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('invokes the callback for an unhandled request', async () => {
  const response = await fetch('https://test.mswjs.io')

  // Request should be performed as-is, since the callback didn't throw.
  expect(response).toHaveProperty('status', 404)
  expect(unhandledListener).toHaveBeenCalledTimes(1)

  const [request, print] = unhandledListener.mock.calls[0]
  expect.soft(request.method).toBe('GET')
  expect.soft(request.url).toBe('https://test.mswjs.io/')
  expect.soft(print).toEqual({
    error: expect.any(Function),
    warning: expect.any(Function),
  })
})
