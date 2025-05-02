// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'
import { InternalError } from '../../../../lib/core/utils/internal/devUtils'

const service = ws.link('wss://localhost:4321')
const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
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

it(
  'errors on unhandled WebSocket connection',
  server.boundary(async () => {
    const socket = new WebSocket('wss://localhost:4321')
    const errorListener = vi.fn()

    await vi.waitUntil(() => {
      return new Promise((resolve, reject) => {
        // These are intentionally swapped. The connection MUST error.
        socket.addEventListener('error', errorListener)
        socket.addEventListener('error', resolve)
        socket.onopen = () => {
          reject(new Error('WebSocket connection opened unexpectedly'))
        }
      })
    })

    expect(console.error).toHaveBeenCalledWith(
      `\
[MSW] Error: intercepted a request without a matching request handler:

  • GET wss://localhost:4321/

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`,
    )

    expect(errorListener).toHaveBeenCalledOnce()

    // Must forward the original `onUnhandledRequest` error as the
    // `cause` property of the error event emitted on the connection.
    const [event] = errorListener.mock.calls[0]
    expect(event).toBeInstanceOf(Event)
    expect(event.type).toBe('error')
    expect(event.cause).toEqual(
      new InternalError(
        '[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
      ),
    )
  }),
)

it(
  'does not error on handled WebSocket connection',
  server.boundary(async () => {
    server.use(service.addEventListener('connection', () => {}))

    const socket = new WebSocket('wss://localhost:4321')

    await vi.waitFor(() => {
      return new Promise((resolve, reject) => {
        socket.onopen = resolve
        socket.onerror = reject
      })
    })

    expect(console.error).not.toHaveBeenCalled()
  }),
)
