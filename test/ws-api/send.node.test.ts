/**
 * @jest-environment node
 */
import { ws } from 'msw'

async function createWebSocketClient(url: string) {
  const client = new WebSocket(url)

  await new Promise((resolve, reject) => {
    client.addEventListener('open', resolve)
    client.addEventListener('error', reject)
  })

  return client
}

const server = ws.link('wss://example.com', {
  quiet: true,
})

beforeAll(() => {
  server.on('connection', (ws) => {
    ws.on('message', (data) => {
      console.log('[server] incoming:', data)
      ws.send('hello from server')
    })
  })
})

afterAll(() => {
  jest.restoreAllMocks()
  server.close()
})

test.skip('sends text to the server', async () => {
  const client = await createWebSocketClient('wss://example.com')
  client.send('abc-123')

  expect(console.log).toHaveBeenCalledWith('[server] incoming:', 'abc-123')
})

test.skip('sends ArrayBuffer to the server', async () => {
  const client = await createWebSocketClient('wss://example.com')
  client.send(new ArrayBuffer(2))

  expect(console.log).toHaveBeenCalledWith(
    '[server] incoming:',
    new ArrayBuffer(2),
  )
})

test.skip('sends Blob to the server', async () => {
  const client = await createWebSocketClient('wss://example.com')
  client.send(new Blob(['abc-123']))

  expect(console.log).toHaveBeenCalledWith(
    '[server] incoming:',
    new Blob(['abc-123']),
  )
})

test.skip('receives data from the server', async () => {
  const client = await createWebSocketClient('wss://mswjs.io/ws')

  let serverData: string
  const handleMessageFromServer = (event: MessageEvent) => {
    serverData = event.data
  }

  client.addEventListener('message', handleMessageFromServer)
  client.send('abc-123')

  expect(serverData).toEqual('hello from server')
})
