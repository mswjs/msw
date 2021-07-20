/**
 * @jest-environment node
 */
import { ws } from 'msw'

const server = ws.link('wss://mswjs.io/ws', {
  quiet: true,
})

async function createClient(url: string) {
  const client = new WebSocket('wss://mswjs.io/ws')

  await new Promise((resolve, reject) => {
    client.addEventListener('open', resolve)
    client.addEventListener('error', reject)
  })

  return client
}

beforeAll(() => {
  jest.spyOn(global.console, 'log').mockImplementation()

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

test('sends text to the server', async () => {
  const client = await createClient('wss://mswjs.io/ws')
  client.send('abc-123')

  expect(console.log).toBeCalledWith('[server] incoming:', 'abc-123')
})

test('sends ArrayBuffer to the server', async () => {
  const client = await createClient('wss://mswjs.io/ws')
  client.send(new ArrayBuffer(2))

  expect(console.log).toBeCalledWith('[server] incoming:', new ArrayBuffer(2))
})

test('sends Blob to the server', async () => {
  const client = await createClient('wss://mswjs.io/ws')
  client.send(new Blob(['abc-123']))

  expect(console.log).toBeCalledWith(
    '[server] incoming:',
    new Blob(['abc-123']),
  )
})

test('receives data from the server', async () => {
  const client = await createClient('wss://mswjs.io/ws')

  let serverData: string
  const handleMessageFromServer = (event: MessageEvent) => {
    serverData = event.data
  }

  client.addEventListener('message', handleMessageFromServer)
  client.send('abc-123')

  expect(serverData).toBe('hello from server')
})
