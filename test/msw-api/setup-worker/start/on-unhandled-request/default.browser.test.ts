import { test, expect } from '../../../../setup/vitest-helpers'

test('warns on unhandled requests by default', async ({
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
  await network.start()

  const response = await fetch(testServer.http.url('/events/unknown-route'))

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /\[MSW\] Warning: intercepted a request without a matching request handler/,
      ),
    ]),
  )
  expect(consoleSpy.get('error')).toBeUndefined()
  expect(response.status()).toBe(404)
})
