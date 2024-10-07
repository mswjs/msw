// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'

const service = ws.link('wss://localhost:4321')
const server = setupServer()

const onUnhandledRequest = vi.fn()

beforeAll(() => {
  server.listen({ onUnhandledRequest })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  server.resetHandlers()
  vi.resetAllMocks()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

it('calls a custom callback on an unhandled WebSocket connection', async () => {
  const socket = new WebSocket('wss://localhost:4321')

  await vi.waitFor(() => {
    return new Promise((resolve, reject) => {
      socket.onopen = resolve
      socket.onerror = reject
    })
  })

  expect(onUnhandledRequest).toHaveBeenCalledOnce()

  const [request] = onUnhandledRequest.mock.calls[0]
  expect(request).toBeInstanceOf(Request)
  expect(request.method).toBe('GET')
  expect(request.url).toBe('wss://localhost:4321/')
  expect(Array.from(request.headers)).toEqual([
    ['connection', 'upgrade'],
    ['upgrade', 'websocket'],
  ])
})

it('does not call a custom callback for a handled WebSocket connection', async () => {
  server.use(service.addEventListener('connection', () => {}))

  const socket = new WebSocket('wss://localhost:4321')

  await vi.waitFor(() => {
    return new Promise((resolve, reject) => {
      socket.onopen = resolve
      socket.onerror = reject
    })
  })

  expect(onUnhandledRequest).not.toHaveBeenCalled()
})
