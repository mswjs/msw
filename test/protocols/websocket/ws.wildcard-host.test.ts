/**
 * @see https://github.com/mswjs/msw/issues/2782
 */
import { ws } from 'msw/ws'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const api = ws.link('ws://*')

const test = defineTestNetwork({
  handlers: [
    api.addEventListener('connection', ({ client }) => {
      client.send('hello from mock')
    }),
  ],
})

test('matches a WebSocket handler with a wildcard host', async () => {
  const socket = new WebSocket('ws://localhost:5000/socket.io/?EIO=4')
  const messagePromise = new Promise<string>((resolve, reject) => {
    socket.onmessage = (event) => {
      resolve(event.data)
    }
    socket.onerror = () => {
      reject(new Error('WebSocket connection errored'))
    }
  })

  await expect(messagePromise).resolves.toBe('hello from mock')
})
