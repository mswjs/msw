import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const test = defineTestNetwork()

test('handles a CORS request with an "opaque" response', async ({
  page,
  testServer,
}) => {
  const errors: Array<Error> = []
  page.on('pageerror', (error) => errors.push(error))

  const response = await globalThis.fetch(testServer.http.url('/cors'), {
    mode: 'no-cors',
  })

  expect.soft(response.status).toBe(0)
  expect.soft(response.type).toBe('opaque')
  expect(errors).toEqual([])
})

test('passes through a cross-origin request to a server that allows the origin', async ({
  testServer,
}) => {
  const response = await globalThis.fetch(testServer.http.url('/cors'))

  expect.soft(response.status).toBe(200)
  expect.soft(response.type).toBe('cors')
  await expect(response.text()).resolves.toBe('hello')
})

test('fails a passthrough cross-origin request to a server that does not allow the origin', async ({
  testServer,
}) => {
  await expect(
    globalThis.fetch(testServer.http.url('/cors-error')),
  ).rejects.toThrow('Failed to fetch')
})

test('passes through a preflighted cross-origin request to a server that allows the origin', async ({
  testServer,
}) => {
  const response = await globalThis.fetch(testServer.http.url('/cors'), {
    method: 'DELETE',
    headers: { 'x-custom-header': 'yes' },
  })

  expect.soft(response.status).toBe(200)
  expect.soft(response.type).toBe('cors')
})

test('fails a preflighted passthrough request to a server that does not allow the origin', async ({
  testServer,
}) => {
  await expect(
    globalThis.fetch(testServer.http.url('/cors-error'), {
      headers: { 'x-custom-header': 'yes' },
    }),
  ).rejects.toThrow('Failed to fetch')
})

test('resolves a mocked cross-origin response without CORS headers', async ({
  fetch,
  network,
  testServer,
}) => {
  network.use(
    http.get(testServer.http.url('/mocked').href, () => {
      return HttpResponse.text('hello world')
    }),
  )

  const response = await fetch(testServer.http.url('/mocked'))

  expect.soft(response.status()).toBe(200)
  expect.soft(response.fromServiceWorker()).toBe(true)
  await expect(response.text()).resolves.toBe('hello world')
})

test('resolves a mocked response to a preflighted request', async ({
  fetch,
  network,
  testServer,
}) => {
  network.use(
    http.options(testServer.http.url('/mocked').href, () => {
      return new HttpResponse(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'x-custom-header',
        },
      })
    }),
    http.get(testServer.http.url('/mocked').href, () => {
      return HttpResponse.text('hello world')
    }),
  )

  const response = await fetch(testServer.http.url('/mocked'), {
    headers: { 'x-custom-header': 'yes' },
  })

  expect.soft(response.status()).toBe(200)
  expect.soft(response.fromServiceWorker()).toBe(true)
  await expect(response.text()).resolves.toBe('hello world')
})

/**
 * @note The browser performs preflight requests directly against the network,
 * bypassing the Service Worker. MSW cannot intercept them in the browser.
 */
test('does not intercept a preflight request for a passthrough request', async ({
  network,
  testServer,
}) => {
  network.use(
    http.options(testServer.http.url('/cors-error').href, () => {
      return new HttpResponse(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'x-custom-header',
        },
      })
    }),
  )

  await expect(
    globalThis.fetch(testServer.http.url('/cors-error'), {
      headers: { 'x-custom-header': 'yes' },
    }),
  ).rejects.toThrow('Failed to fetch')
})
