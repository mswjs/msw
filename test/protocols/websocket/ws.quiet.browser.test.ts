import { ws } from 'msw/ws'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const api = ws.link('wss://localhost/*')
const handlers = [api.addEventListener('connection', () => {})]
const test = defineNetwork({ handlers, workerOptions: { quiet: true } })

test('does not log anything if "quiet" was set to "true"', async ({
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()

  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket('wss://localhost/path')
    socket.onopen = () => {
      socket.send('hello')
      socket.send('world')
      socket.close()
    }
    socket.onclose = () => {
      resolve()
    }
    socket.onerror = () => {
      reject(new Error('Client connection closed'))
    }
  })

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
})
