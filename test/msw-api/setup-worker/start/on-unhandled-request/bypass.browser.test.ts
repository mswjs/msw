import { test, expect } from '../../../../setup/vitest-helpers'

test('bypasses an unhandled request', async ({
  network,
  spyOnConsole,
  fetch,
  testServer,
}) => {
  if (!('stop' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  await network.stop()
  const consoleSpy = spyOnConsole()
  await network.start({ onUnhandledRequest: 'bypass' })

  const response = await fetch(testServer.http.url('/events/unknown-route'))

  expect(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('warning')).toBeUndefined()
  expect(response.status()).toBe(404)
})
