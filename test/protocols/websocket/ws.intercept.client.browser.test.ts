import { ws } from 'msw/ws'
import type { Network } from '../../setup/network'
import { test, expect } from '../../setup/vitest-helpers'

test('does not throw on connecting to a non-existing host', async ({
  network,
}) => {
  const service = ws.link('*')
  network.use(
    service.addEventListener('connection', ({ client }) => {
      queueMicrotask(() => client.close())
    }),
  )

  const socket = new WebSocket('ws://non-existing-host.com')
  await expect(
    new Promise<void>((resolve, reject) => {
      socket.onclose = () => resolve()
      socket.onerror = () => reject(new Error('WebSocket connection errored'))
    }),
  ).resolves.toBeUndefined()
})

async function expectOutgoingMessage(
  network: Network,
  outgoingMessage: Parameters<WebSocket['send']>[0],
): Promise<void> {
  const service = ws.link('wss://example.com')
  const receivedMessage = Promise.withResolvers<string>()

  network.use(
    service.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', async (event) => {
        if (typeof event.data === 'string') {
          receivedMessage.resolve(event.data)
          return
        }

        if (event.data instanceof Blob) {
          receivedMessage.resolve(await event.data.text())
          return
        }

        receivedMessage.resolve(new TextDecoder().decode(event.data))
      })
    }),
  )

  const socket = new WebSocket('wss://example.com')
  socket.onopen = () => socket.send(outgoingMessage)

  await expect(receivedMessage.promise).resolves.toBe('hello world')
  socket.close()
}

test('intercepts outgoing client text message', async ({ network }) => {
  await expectOutgoingMessage(network, 'hello world')
})

test('intercepts outgoing client Blob message', async ({ network }) => {
  await expectOutgoingMessage(network, new Blob(['hello world']))
})

test('intercepts outgoing client ArrayBuffer message', async ({ network }) => {
  await expectOutgoingMessage(network, new TextEncoder().encode('hello world'))
})

test('resolves relative link URL against the page origin', async ({
  network,
}) => {
  const service = ws.link('/api')
  network.use(
    service.addEventListener('connection', ({ client }) => {
      client.send('hello world')
    }),
  )

  const socket = new WebSocket('/api')
  await expect(
    new Promise<string>((resolve, reject) => {
      socket.onmessage = (event) => resolve(event.data)
      socket.onerror = () => {
        reject(new Error('Did not match the WebSocket connection'))
      }
    }),
  ).resolves.toBe('hello world')
  socket.close()
})
