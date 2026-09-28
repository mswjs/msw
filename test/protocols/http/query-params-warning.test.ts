import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const test = defineTestNetwork()

test('warns when a request handler URL contains query parameters', async ({
  fetch,
  spyOnConsole,
  network,
}) => {
  const consoleSpy = spyOnConsole()

  network.use(
    http.get('*/user?name=admin', () => {
      return HttpResponse.text('user-response')
    }),
    http.post('*/login?id=123&type=auth', () => {
      return HttpResponse.text('login-response')
    }),
  )

  expect(consoleSpy.get('warning')).toEqual([
    `[MSW] Found a redundant usage of query parameters in the request handler URL for "GET */user?name=admin". Please match against a path instead and access query parameters using "new URL(request.url).searchParams" instead. Learn more: https://mswjs.io/docs/http/intercepting-requests#querysearch-parameters`,
    `[MSW] Found a redundant usage of query parameters in the request handler URL for "POST */login?id=123&type=auth". Please match against a path instead and access query parameters using "new URL(request.url).searchParams" instead. Learn more: https://mswjs.io/docs/http/intercepting-requests#querysearch-parameters`,
  ])

  await fetch('/user?name=admin').then(async (response) => {
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('user-response')
  })

  await fetch('/user').then(async (response) => {
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('user-response')
  })

  await fetch('/login?id=123&type=auth', {
    method: 'POST',
  }).then(async (response) => {
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('login-response')
  })

  await fetch('/login', {
    method: 'POST',
  }).then(async (response) => {
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('login-response')
  })
})
