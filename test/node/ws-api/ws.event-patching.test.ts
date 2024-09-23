// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'
import { WebSocketServer } from '../../support/WebSocketServer'

const service = ws.link('ws://*')
const originalServer = new WebSocketServer()

const server = setupServer(
  service.addEventListener('connection', ({ server }) => {
    server.connect()
  }),
)

beforeAll(async () => {
  server.listen()
  await originalServer.listen()
})

afterEach(() => {
  server.resetHandlers()
  originalServer.resetState()
})

afterAll(async () => {
  server.close()
  await originalServer.close()
})

it('patches incoming server message', async () => {
  originalServer.once('connection', (client) => {
    client.send('hi from John')
  })

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      /**
       * @note Since the initial handler connects to the server,
       * there's no need to call `server.connect()` again.
       */
      server.addEventListener('message', (event) => {
        // Preventing the default stops the server-to-client forwarding.
        // It means that the WebSocket client won't receive the
        // actual server message.
        event.preventDefault()
        client.send(event.data.replace('John', 'Sarah'))
      })
    }),
  )

  const messageListener = vi.fn()
  const ws = new WebSocket(originalServer.url)
  ws.onmessage = (event) => messageListener(event.data)

  await vi.waitFor(() => {
    expect(messageListener).toHaveBeenNthCalledWith(1, 'hi from Sarah')
    expect(messageListener).toHaveBeenCalledTimes(1)
  })
})

it('combines original and mock server messages', async () => {
  originalServer.once('connection', (client) => {
    client.send('original message')
  })

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.addEventListener('message', () => {
        client.send('mocked message')
      })
    }),
  )

  const messageListener = vi.fn()
  const ws = new WebSocket(originalServer.url)
  ws.onopen = () => ws.send('hello')
  ws.onmessage = (event) => messageListener(event.data)

  await vi.waitFor(() => {
    /**
     * @note That the server will send the message as soon as the client
     * connects. This happens before the event handler is called.
     */
    expect(messageListener).toHaveBeenNthCalledWith(1, 'original message')
    expect(messageListener).toHaveBeenNthCalledWith(2, 'mocked message')
    expect(messageListener).toHaveBeenCalledTimes(2)
  })
})

it('combines original and mock server messages in the different order', async () => {
  originalServer.once('connection', (client) => {
    client.send('original message')
  })

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.addEventListener('message', (event) => {
        /**
         * @note To change the incoming server events order,
         * prevent the default, send a mocked message, and
         * then send the original message as-is.
         */
        event.preventDefault()
        client.send('mocked message')
        client.send(event.data)
      })
    }),
  )

  const messageListener = vi.fn()
  const ws = new WebSocket(originalServer.url)
  ws.onmessage = (event) => messageListener(event.data)

  await vi.waitFor(() => {
    expect(messageListener).toHaveBeenNthCalledWith(1, 'mocked message')
    expect(messageListener).toHaveBeenNthCalledWith(2, 'original message')
    expect(messageListener).toHaveBeenCalledTimes(2)
  })
})
