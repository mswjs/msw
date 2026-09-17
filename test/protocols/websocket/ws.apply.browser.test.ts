import { ws } from 'msw/ws'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const api = ws.link('wss://example.com')
const handlers = [api.addEventListener('connection', () => {})]
const test = defineNetwork({ enabled: false, handlers })

test('does not apply the interceptor until "worker.start()" is called', async ({
  network,
}) => {
  if (!('start' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  expect(new WebSocket('wss://example.com').constructor.name).toBe('WebSocket')

  await network.start()

  expect(new WebSocket('wss://example.com').constructor.name).not.toBe(
    'WebSocket',
  )
})
