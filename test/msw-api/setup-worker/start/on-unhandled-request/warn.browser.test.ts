import { http } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.post('*/explicit-return', () => {
    return
  }),
  http.post('*/implicit-return', () => {}),
]
const test = defineNetwork({
  handlers,
  workerOptions: { onUnhandledRequest: 'warn' },
})

test('warns on an unhandled REST API request with an absolute URL', async ({
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const url = testServer.http.url('/events/unknown-route')
  const response = await fetch(url)

  expect(response.status()).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([expect.stringContaining(`• GET ${url}`)]),
  )
})

test('warns on an unhandled REST API request with a relative URL', async ({
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  const response = await fetch('/user-details')

  expect(response.status()).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([expect.stringContaining('• GET /user-details')]),
  )
})

test('does not warn when a handler explicitly returns no response', async ({
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  const response = await fetch('/explicit-return', { method: 'POST' })

  expect(response.status()).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.not.arrayContaining([
      expect.stringContaining(
        '[MSW] Warning: intercepted a request without a matching request handler',
      ),
    ]),
  )
})

test('does not warn when a handler implicitly returns no response', async ({
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  const response = await fetch('/implicit-return', { method: 'POST' })

  expect(response.status()).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.not.arrayContaining([
      expect.stringContaining(
        '[MSW] Warning: intercepted a request without a matching request handler',
      ),
    ]),
  )
})

test('ignores common static assets when using the "warn" strategy', async ({
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await fetch('/styles/main.css').catch(() => null)

  expect(consoleSpy.get('warning')).toBeUndefined()
})
