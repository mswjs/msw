/**
 * @vitest-environment node
 */
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
  vi.resetAllMocks()
})

afterAll(() => {
  server.close()
})

it('calls the given callback function on un unhandled request', async () => {
  const response = await fetch('https://test.mswjs.io')

  // Request should be performed as-is, since the callback didn't throw.
  expect(response).toHaveProperty('status', 404)
  expect(unhandledListener).toHaveBeenCalledTimes(1)

  const [request, print] = unhandledListener.mock.calls[0]
  expect(request.method).toBe('GET')
  expect(request.url).toBe('https://test.mswjs.io/')
  expect(print).toEqual({
    error: expect.any(Function),
    warning: expect.any(Function),
  })
})

it('calls the given callback on unhandled "file://" requests', async () => {
  await fetch('file:///does/not/exist').catch(() => void 0)

  expect(unhandledListener).toHaveBeenCalledTimes(1)

  const [request, print] = unhandledListener.mock.calls[0]
  expect(request.method).toBe('GET')
  expect(request.url).toBe('file:///does/not/exist')
  expect(print).toEqual({
    error: expect.any(Function),
    warning: expect.any(Function),
  })
})
