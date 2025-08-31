// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'

const service = ws.link('wss://localhost:4321')
const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  server.resetHandlers()
  vi.resetAllMocks()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

it(
  'warns on unhandled WebSocket connection',
  server.boundary(async () => {
    const socket = new WebSocket('wss://localhost:4321')

    await vi.waitFor(() => {
      return new Promise((resolve, reject) => {
        socket.onopen = resolve
        socket.onerror = reject
      })
    })

    expect(console.warn).toHaveBeenCalledWith(
      `\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET wss://localhost:4321/

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`,
    )
  }),
)

it(
  'does not warn on handled WebSocket connection',
  server.boundary(async () => {
    server.use(service.addEventListener('connection', () => {}))

    const socket = new WebSocket('wss://localhost:4321')

    await vi.waitFor(() => {
      return new Promise((resolve, reject) => {
        socket.onopen = resolve
        socket.onerror = reject
      })
    })

    expect(console.warn).not.toHaveBeenCalled()
  }),
)
