import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
]
const test = defineNetwork({ handlers })

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

test('prints a warning on multiple worker.stop() calls', async ({
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
  expect(consoleSpy.get('warning')).toBeUndefined()

  await network.stop()

  expect(consoleSpy.get('log')?.filter(isStopMessage)).toHaveLength(1)
  expect(consoleSpy.get('warning')).toEqual([
    `[MSW] Found a redundant "worker.stop()" call. Notice that stopping the worker after it has already been stopped has no effect. Consider removing this "worker.stop()" call.`,
  ])
})
