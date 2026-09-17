import { ws } from 'msw/ws'
import { test, expect } from '../../setup/vitest-helpers'

test('sends data to a single client on connection', async ({ network }) => {
  const service = ws.link('wss://example.com')

  network.use(
    service.addEventListener('connection', ({ client }) => {
      client.send('hello world')
    }),
  )

  const socket = new WebSocket('wss://example.com')
  const clientMessage = await new Promise<string>((resolve, reject) => {
    socket.onmessage = (event) => {
      resolve(event.data)
    }
    socket.onerror = () => {
      reject(new Error('WebSocket error'))
    }
  }).finally(() => {
    socket.close()
  })

  expect(clientMessage).toBe('hello world')
})

test('sends data in response to a client message', async ({ network }) => {
  const service = ws.link('wss://example.com')

  network.use(
    service.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        if (typeof event.data === 'string' && event.data === 'hello') {
          client.send('hello world')
        }
      })
    }),
  )

  const socket = new WebSocket('wss://example.com')
  socket.onopen = () => {
    socket.send('ignore this')
    socket.send('hello')
  }

  const clientMessage = await new Promise<string>((resolve, reject) => {
    socket.onmessage = (event) => {
      resolve(event.data)
    }
    socket.onerror = () => {
      reject(new Error('WebSocket error'))
    }
  }).finally(() => {
    socket.close()
  })

  expect(clientMessage).toBe('hello world')
})
