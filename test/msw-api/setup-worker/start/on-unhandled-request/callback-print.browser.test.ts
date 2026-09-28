import { HttpNetworkFrame } from 'msw/experimental'
import { test, expect } from '../../../../setup/vitest-helpers'

test('executes the default "warn" strategy in a custom callback', async ({
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
    onUnhandledFrame({ frame, defaults }) {
      if (frame instanceof HttpNetworkFrame) {
        const { request } = frame.data
        console.log(`Oops, unhandled ${request.method} ${request.url}`)
      }

      defaults.warn()
    },
  })

  const url = testServer.http.url('/events/passthrough')
  const response = await fetch(url)

  expect.soft(response.status(), 'Performs the request as-is').toBe(200)
  await expect.soft(response.text()).resolves.toBe('passthrough-response')
  expect
    .soft(consoleSpy.get('log'), 'Executes the custom callback')
    .toContain(`Oops, unhandled GET ${url}`)
  expect.soft(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([expect.stringContaining(`• GET ${url}`)]),
  )
})

test('executes the default "error" strategy in a custom callback', async ({
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
    onUnhandledFrame({ frame, defaults }) {
      if (frame instanceof HttpNetworkFrame) {
        const { request } = frame.data
        console.log(`Oops, unhandled ${request.method} ${request.url}`)
      }

      defaults.error()
    },
  })

  const url = testServer.http.url('/events/passthrough')
  const response = await fetch(url)

  expect.soft(response.status(), 'Performs the request as-is').toBe(200)
  await expect.soft(response.text()).resolves.toBe('passthrough-response')
  expect
    .soft(consoleSpy.get('log'), 'Executes the custom callback')
    .toContain(`Oops, unhandled GET ${url}`)
  expect.soft(consoleSpy.get('warning')).toBeUndefined()
  expect(consoleSpy.get('error')).toEqual(
    expect.arrayContaining([expect.stringContaining(`• GET ${url}`)]),
  )
  expect(consoleSpy.get('error')).not.toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        '[MSW] Cannot bypass a request when using the "error" strategy',
      ),
    ]),
  )
})
