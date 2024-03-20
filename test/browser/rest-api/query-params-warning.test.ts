import { test, expect } from '../playwright.extend'

test('warns when a request handler URL contains query parameters', async ({
  loadExample,
  fetch,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./query-params-warning.mocks.ts'))

  expect(consoleSpy.get('warning')).toEqual([
    `[MSW] Found a redundant usage of query parameters in the request handler URL for "GET /user?name=admin". Please match against a path instead and access query parameters by constructing a URL instance out of the request.url string. Please see the documentation for more details: https://mswjs.io/docs/recipes/query-parameters`,
    `[MSW] Found a redundant usage of query parameters in the request handler URL for "POST /login?id=123&type=auth". Please match against a path instead and access query parameters by constructing a URL instance out of the request.url string. Please see the documentation for more details: https://mswjs.io/docs/recipes/query-parameters`,
  ])

  await fetch('/user?name=admin').then(async (res) => {
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe('user-response')
  })

  await fetch('/user').then(async (res) => {
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe('user-response')
  })

  await fetch('/login?id=123&type=auth', {
    method: 'POST',
  }).then(async (res) => {
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe('login-response')
  })

  await fetch('/login', {
    method: 'POST',
  }).then(async (res) => {
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe('login-response')
  })
})
