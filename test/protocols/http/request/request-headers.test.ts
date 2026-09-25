import { http, HttpResponse, passthrough } from 'msw'
import { expect, test } from '../../../setup/vitest-helpers'

interface CookieRequestInit {
  credentials: RequestCredentials
  headers: Record<string, string>
}

/**
 * Sets the given cookie so it's sent with the request to the test server.
 * "cookie" is a forbidden request header name in the browser and cannot be
 * set on the request directly. Instead, set it on the document and include
 * the credentials on the request so the browser attaches it.
 * @see https://fetch.spec.whatwg.org/#forbidden-request-header
 */
function bakeCookie(cookie: string): CookieRequestInit {
  if (typeof document === 'undefined') {
    return {
      credentials: 'include',
      headers: { cookie },
    }
  }

  document.cookie = cookie

  return {
    credentials: 'include',
    headers: {},
  }
}

test('captures the headers of the intercepted request', async ({
  network,
  fetch,
}) => {
  network.use(
    http.get('https://example.com/resource', ({ request }) => {
      return HttpResponse.json({
        'x-custom-header': request.headers.get('x-custom-header'),
      })
    }),
  )

  const response = await fetch('https://example.com/resource', {
    headers: { 'x-custom-header': 'yes' },
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    'x-custom-header': 'yes',
  })
})

test('receives all headers from the request header with multiple values', async ({
  network,
  fetch,
}) => {
  network.use(
    http.post('https://test.mswjs.io', ({ request }) => {
      return HttpResponse.json({
        'x-header': request.headers.get('x-header'),
      })
    }),
  )

  const headers = new Headers({ 'x-header': 'application/json' })
  headers.append('x-header', 'application/hal+json')

  const response = await fetch('https://test.mswjs.io', {
    method: 'POST',
    headers: Object.fromEntries(headers.entries()),
  })
  const status = response.status()
  const body = await response.json()

  expect(status).toBe(200)
  expect(body).toEqual({
    /**
     * @fixme Multiple headers value becomes incompatible
     * with the latest testing setup changes.
     */
    'x-header': 'application/json, application/hal+json',
  })
})

test('forwards the unhandled request headers as-is', async ({
  fetch,
  testServer,
}) => {
  const cookieInit = bakeCookie('sessionId=abc-123')

  const response = await fetch(testServer.http.url('/passthrough-resource'), {
    credentials: cookieInit.credentials,
    headers: {
      ...cookieInit.headers,
      'x-custom-header': 'yes',
    },
  })

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.toMatchObject({
    cookie: 'sessionId=abc-123',
    'x-custom-header': 'yes',
  })
  await expect(response.text()).resolves.toBe('hello world')
})

test('forwards the passthrough request headers as-is', async ({
  network,
  fetch,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/passthrough-resource')
  const cookieInit = bakeCookie('sessionId=abc-123')

  network.use(
    http.get(endpointUrl.href, () => {
      return passthrough()
    }),
  )

  const response = await fetch(endpointUrl, {
    credentials: cookieInit.credentials,
    headers: {
      ...cookieInit.headers,
      'x-custom-header': 'yes',
    },
  })

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.toMatchObject({
    cookie: 'sessionId=abc-123',
    'x-custom-header': 'yes',
  })
  await expect(response.text()).resolves.toBe('hello world')
})

test('allows adding headers to a passthrough request', async ({
  network,
  fetch,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/passthrough-resource')

  network.use(
    http.get(endpointUrl.href, ({ request }) => {
      request.headers.set('x-added-header', 'from-resolver')
      return passthrough()
    }),
  )

  const response = await fetch(endpointUrl, {
    headers: { 'x-custom-header': 'yes' },
  })

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.toMatchObject({
    'x-custom-header': 'yes',
    'x-added-header': 'from-resolver',
  })
  await expect(response.text()).resolves.toBe('hello world')
})

test('allows removing headers from a passthrough request', async ({
  network,
  fetch,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/passthrough-resource')

  network.use(
    http.get(endpointUrl.href, ({ request }) => {
      request.headers.delete('x-custom-header')
      return passthrough()
    }),
  )

  const response = await fetch(endpointUrl, {
    headers: { 'x-custom-header': 'yes' },
  })

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.not.toHaveProperty(
    'x-custom-header',
  )
  await expect(response.text()).resolves.toBe('hello world')
})

test('preserves forbidden headers when modifying a passthrough request', async ({
  network,
  fetch,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/passthrough-resource')
  const cookieInit = bakeCookie('sessionId=abc-123')

  network.use(
    http.get(endpointUrl.href, ({ request }) => {
      request.headers.set('x-custom-header', 'from-resolver')
      return passthrough()
    }),
  )

  const response = await fetch(endpointUrl, {
    credentials: cookieInit.credentials,
    headers: cookieInit.headers,
  })

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.toMatchObject({
    cookie: 'sessionId=abc-123',
    'x-custom-header': 'from-resolver',
  })
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
