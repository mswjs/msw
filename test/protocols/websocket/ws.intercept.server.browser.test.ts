import { ws } from 'msw/ws'
import type { Network } from '../../setup/network'
import type { TestServer } from '../../setup/vitest'
import { test, expect } from '../../setup/vitest-helpers'

test('intercepts incoming server text message', async ({
  network,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?greet').href
  const serverMessage = Promise.withResolvers<string>()
  const service = ws.link(serverUrl)

  network.use(
    service.addEventListener('connection', ({ server }) => {
      server.connect()
      server.addEventListener('message', (event) => {
        if (typeof event.data === 'string') {
          serverMessage.resolve(event.data)
        }
      })
    }),
  )

  const clientMessage = await new Promise<string>((resolve, reject) => {
    const socket = new WebSocket(serverUrl)
    socket.onerror = () => reject(new Error('Socket error'))
    socket.addEventListener('message', (event) => {
      socket.close()
      resolve(event.data)
    })
  })

  expect(clientMessage).toBe('hello from server')
  await expect(serverMessage.promise).resolves.toBe('hello from server')
})

async function expectIncomingBinaryMessage(
  network: Network,
  testServer: TestServer,
  binaryType: BinaryType,
): Promise<void> {
  const serverUrl = testServer.ws.url('/?greet-binary').href
  const serverMessage = Promise.withResolvers<string>()
  const service = ws.link(serverUrl)

  network.use(
    service.addEventListener('connection', ({ server }) => {
      server.connect()
      server.addEventListener('message', async (event) => {
        if (typeof event.data === 'string') {
          serverMessage.resolve(event.data)
          return
        }

        if (event.data instanceof Blob) {
          serverMessage.resolve(await event.data.text())
          return
        }

        serverMessage.resolve(new TextDecoder().decode(event.data))
      })
    }),
  )

  const clientMessage = await new Promise<string>((resolve, reject) => {
    const socket = new WebSocket(serverUrl)
    socket.binaryType = binaryType
    socket.onerror = () => reject(new Error('Socket error'))
    socket.addEventListener('message', async (event) => {
      socket.close()
      resolve(
        event.data instanceof Blob
          ? await event.data.text()
          : new TextDecoder().decode(event.data),
      )
    })
  })

  expect(clientMessage).toBe('hello')
  await expect(serverMessage.promise).resolves.toBe('hello')
}

test('intercepts incoming server Blob message', async ({
  network,
  testServer,
}) => {
  await expectIncomingBinaryMessage(network, testServer, 'blob')
})

test('intercepts incoming server ArrayBuffer message', async ({
  network,
  testServer,
}) => {
  await expectIncomingBinaryMessage(network, testServer, 'arraybuffer')
})
