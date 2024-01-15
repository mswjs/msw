import { test, expect } from '../../playwright.extend'

test('supports throwing a plain Response in a response resolver', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./throw-response.mocks.ts'))

  const response = await fetch('/throw/plain')
  expect(response.status()).toBe(200)
  expect(await response.text()).toBe('hello world')
})

test('supports throwing an HttpResponse in a response resolver', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./throw-response.mocks.ts'))

  const response = await fetch('/throw/http-response')
  expect(response.status()).toBe(200)
  expect(await response.headerValue('Content-Type')).toBe('text/plain')
  expect(await response.text()).toBe('hello world')
})

test('supports throwing an error response in a response resolver', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./throw-response.mocks.ts'))

  const errorResponse = await fetch('/throw/error')
  expect(errorResponse.status()).toBe(400)
  expect(await errorResponse.headerValue('Content-Type')).toBe('text/plain')
  expect(await errorResponse.text()).toBe('invalid input')
})

test('supports throwing a network error in a response resolver', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./throw-response.mocks.ts'))

  const networkError = await page.evaluate(() => {
    return fetch('/throw/network-error')
      .then(() => null)
      .catch((error) => ({
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      }))
  })

  expect(networkError?.name).toBe('TypeError')
  expect(networkError?.message).toBe('Failed to fetch')
  expect(networkError?.cause).toBeUndefined()
})

test('supports middleware-style responses', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./throw-response.mocks.ts'))

  const response = await fetch('/middleware?id=1')
  expect(response.status()).toBe(200)
  expect(await response.text()).toBe('ok')

  const errorResponse = await fetch('/middleware')
  expect(errorResponse.status()).toBe(400)
  expect(await errorResponse.text()).toBe('must have id')
})

test('throws a non-Response error as-is', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./throw-response.mocks.ts'))

  // Unhandled exceptions in the response resolver in the browser
  // are coerces to 500 Internal Server Error responses by MSW.
  const networkError = await fetch('/throw/non-response-error')

  expect(networkError.status()).toBe(500)
  expect(await networkError.json()).toEqual({
    name: 'Error',
    message: 'Oops!',
    stack: expect.any(String),
  })
})
