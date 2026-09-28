import { HttpNetworkFrame } from 'msw/experimental'
import { test, expect } from '../../../../setup/vitest-helpers'

test('executes a given callback on an unhandled request', async ({
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
  await network.start({
    onUnhandledFrame({ frame }) {
      if (frame instanceof HttpNetworkFrame) {
        const { request } = frame.data
        console.log(`Oops, unhandled ${request.method} ${request.url}`)
      }
    },
  })

  const url = testServer.http.url('/events/unknown-route')
  const response = await fetch(url)

  expect(response.status()).toBe(404)
  expect(consoleSpy.get('log')).toContain(`Oops, unhandled GET ${url}`)
  expect(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('warning')).toBeUndefined()
})
