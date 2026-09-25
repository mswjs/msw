import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
]
const test = defineTestNetwork({ handlers })

test('disables mocking when the worker is stopped', async ({
  network,
  fetch,
  testServer,
}) => {
  if (!('stop' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  await network.stop()
  const response = await fetch(
    testServer.http.url('/user'),
    {},
    { captureResponse: false },
  )

  expect.soft(response.fromServiceWorker()).toBe(false)
  await expect(response.json()).resolves.toEqual({
    name: 'The Octocat',
    location: 'San Francisco',
  })

  await network.start({ quiet: true })
})

test('throws on multiple worker.stop() calls', async ({
  network,
  spyOnConsole,
}) => {
  if (!('stop' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  const consoleSpy = spyOnConsole()
  await network.stop()

  const isStopMessage = (text: string): boolean => {
    return text === '[MSW] Mocking disabled.'
  }

  expect(consoleSpy.get('log')?.filter(isStopMessage)).toHaveLength(1)

  await expect(network.stop()).rejects.toThrow(
    'Failed to call "disable" on the network: already disabled',
  )

  expect(consoleSpy.get('log')?.filter(isStopMessage)).toHaveLength(1)
})
