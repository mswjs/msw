// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'

const service = ws.link('wss://*')

const server = setupServer(
  service.addEventListener('connection', ({ client }) => {
    client.addEventListener('message', (event) => {
      if (event.data === 'hello') {
        client.send('hello, client!')
      }

      if (event.data === 'fallthrough') {
        client.send('ok')
      }
    })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it.concurrent(
  'resolves outgoing events using initial handlers',
  server.boundary(async () => {
    const messageListener = vi.fn()
    const ws = new WebSocket('wss://example.com')
    ws.onmessage = (event) => messageListener(event.data)
    ws.onopen = () => ws.send('hello')

    await vi.waitFor(() => {
      expect(messageListener).toHaveBeenCalledWith('hello, client!')
      expect(messageListener).toHaveBeenCalledTimes(1)
    })
  }),
)

it.concurrent(
  'overrides an outgoing event listener',
  server.boundary(async () => {
    server.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // Stopping immediate event propagation will prevent
            // the same message listener in the initial handler
            // from being called.
            event.stopImmediatePropagation()
            client.send('howdy, client!')
          }
        })
      }),
    )

    const messageListener = vi.fn()
    const ws = new WebSocket('wss://example.com')
    ws.onmessage = (event) => messageListener(event.data)
    ws.onopen = () => ws.send('hello')

    await vi.waitFor(() => {
      expect(messageListener).toHaveBeenCalledWith('howdy, client!')
      expect(messageListener).toHaveBeenCalledTimes(1)
    })
  }),
)

it.concurrent(
  'combines initial and override listeners',
  server.boundary(async () => {
    server.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // Not stopping the event propagation will result in both
            // the override handler and the runtime handler sending
            // data to the client in order. The override handler is
            // prepended, so it will send data first.
            client.send('override data')
          }
        })
      }),
    )

    const messageListener = vi.fn()
    const ws = new WebSocket('wss://example.com')
    ws.onmessage = (event) => messageListener(event.data)
    ws.onopen = () => ws.send('hello')

    await vi.waitFor(() => {
      // The runtime handler is executed first, so it sends its message first.
      expect(messageListener).toHaveBeenNthCalledWith(1, 'override data')
      // The initial handler will send its message next.
      expect(messageListener).toHaveBeenNthCalledWith(2, 'hello, client!')
      expect(messageListener).toHaveBeenCalledTimes(2)
    })
  }),
)

it.concurrent(
  'combines initial and override listeners in the opposite order',
  async () => {
    server.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // Queuing the send to the next tick will ensure
            // that the initial handler sends data first,
            // and this override handler sends data next.
            queueMicrotask(() => {
              client.send('override data')
            })
          }
        })
      }),
    )

    const messageListener = vi.fn()
    const ws = new WebSocket('wss://example.com')
    ws.onmessage = (event) => messageListener(event.data)
    ws.onopen = () => ws.send('hello')

    await vi.waitFor(() => {
      expect(messageListener).toHaveBeenNthCalledWith(1, 'hello, client!')
      expect(messageListener).toHaveBeenNthCalledWith(2, 'override data')
      expect(messageListener).toHaveBeenCalledTimes(2)
    })
  },
)

it.concurrent(
  'does not affect unrelated events',
  server.boundary(async () => {
    server.use(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (event.data === 'hello') {
            // Stopping immediate event propagation will prevent
            // the same message listener in the initial handler
            // from being called.
            event.stopImmediatePropagation()
            client.send('howdy, client!')
          }
        })
      }),
    )

    const messageListener = vi.fn()
    const ws = new WebSocket('wss://example.com')
    ws.onmessage = (event) => {
      messageListener(event.data)

      if (event.data === 'howdy, client!') {
        ws.send('fallthrough')
      }
    }
    ws.onopen = () => ws.send('hello')

    await vi.waitFor(() => {
      expect(messageListener).toHaveBeenNthCalledWith(1, 'howdy, client!')
    })

    await vi.waitFor(() => {
      // The initial handler still sends data to unrelated events.
      expect(messageListener).toHaveBeenNthCalledWith(2, 'ok')
      expect(messageListener).toHaveBeenCalledTimes(2)
    })
  }),
)
