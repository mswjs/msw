import { sse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  sse('http://localhost/stream', ({ client }) => {
    client.send({
      data: { username: 'john' },
    })
  }),
]
const test = defineNetwork({ handlers, workerOptions: { quiet: true } })

test('does not log anything if the "quiet" option is set to true', async ({
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()

  await new Promise<string>((resolve, reject) => {
    const source = new EventSource('http://localhost/stream')
    source.onerror = () => {
      reject(new Error('EventSource connection failed'))
    }
    source.addEventListener('message', (event) => {
      source.close()
      resolve(`${event.type}:${event.data}`)
    })
  })

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
})
