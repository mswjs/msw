import { ws } from 'msw/ws'
import { test, expect } from '../../setup/vitest-helpers'

test('does not connect to the actual server by default', async ({
  network,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?greet').href
  const service = ws.link(serverUrl)
  network.use(
    service.addEventListener('connection', ({ client }) => {
      queueMicrotask(() => client.send('mock'))
    }),
  )

  const clientMessage = await new Promise((resolve, reject) => {
    const socket = new WebSocket(serverUrl)
    socket.onmessage = (event) => {
      socket.close()
      resolve(event.data)
    }
    socket.onerror = () => reject(new Error('WebSocket error'))
  })

  expect(clientMessage).toBe('mock')
})

test('forwards incoming server events to the client once connected', async ({
  network,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?greet').href
  const service = ws.link(serverUrl)
  network.use(
    service.addEventListener('connection', ({ server }) => {
      server.connect()
    }),
  )

  const clientMessage = await new Promise((resolve, reject) => {
    const socket = new WebSocket(serverUrl)
    socket.onmessage = (event) => {
      socket.close()
      resolve(event.data)
    }
    socket.onerror = reject
  })

  expect(clientMessage).toBe('hello from server')
})

test('throws an error when connecting to a non-existing server', async ({
  network,
}) => {
  const serverUrl = 'ws://non-existing-websocket-address.com'
  const service = ws.link(serverUrl)
  network.use(
    service.addEventListener('connection', ({ server }) => {
      server.connect()
    }),
  )

  const error = await new Promise((resolve) => {
    const socket = new WebSocket(serverUrl)
    socket.onerror = () => resolve('Connection failed')
  })

  expect(error).toBe('Connection failed')
})
