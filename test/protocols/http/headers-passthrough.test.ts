import { http, passthrough } from 'msw'
import { expect, test } from '../../setup/vitest-helpers'

/**
 * @note The "/passthrough-resource" route on the test server
 * echoes the received request headers as response headers.
 */
test('forwards a custom request header set in the resolver to the original server', async ({
  network,
  fetch,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/passthrough-resource')

  network.use(
    http.get(endpointUrl.href, ({ request }) => {
      request.headers.set('x-custom-header', 'from-resolver')
      return passthrough()
    }),
  )

  const response = await fetch(endpointUrl)

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.toHaveProperty(
    'x-custom-header',
    'from-resolver',
  )
  await expect(response.text()).resolves.toBe('hello world')
})

test('forwards a forbidden request header set in the resolver to the original server', async ({
  network,
  fetch,
  testServer,
  task,
}) => {
  const endpointUrl = testServer.http.url('/passthrough-resource')

  network.use(
    http.get(endpointUrl.href, ({ request }) => {
      request.headers.set('cookie', 'sessionId=from-resolver')
      return passthrough()
    }),
  )

  const response = await fetch(endpointUrl)
  const responseHeaders = await response.allHeaders()

  expect(response.status()).toBe(200)
  await expect(response.text()).resolves.toBe('hello world')

  if (task.file.projectName === 'browser') {
    /**
     * @note "cookie" is a forbidden request header name in the browser.
     * Setting it on a request is silently ignored by the Fetch API in both
     * the page and the worker, so the header never reaches the server.
     * @see https://fetch.spec.whatwg.org/#forbidden-request-header
     */
    expect(responseHeaders).not.toHaveProperty('cookie')
    return
  }

  expect(responseHeaders).toHaveProperty('cookie', 'sessionId=from-resolver')
})
