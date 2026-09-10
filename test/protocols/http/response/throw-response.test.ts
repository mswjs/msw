import { HttpResponse, http } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const handlers = [
  http.get('*/throw/plain', () => {
    throw new Response('hello world')
  }),
  http.get('*/throw/http-response', () => {
    throw HttpResponse.text('hello world')
  }),
  http.get('*/throw/error', () => {
    throw HttpResponse.text('invalid input', { status: 400 })
  }),
  http.get('*/throw/network-error', () => {
    throw HttpResponse.error()
  }),
  http.get('*/middleware', ({ request }) => {
    const url = new URL(request.url)

    if (!url.searchParams.has('id')) {
      throw HttpResponse.text('must have id', { status: 400 })
    }

    return HttpResponse.text('ok')
  }),
  http.get('*/throw/non-response-error', () => {
    throw new Error('Oops!')
  }),
]

const test = defineNetwork({ handlers })

test('supports throwing a plain Response in a response resolver', async ({
  fetch,
}) => {
  const response = await fetch('/throw/plain')
  expect(response.status()).toBe(200)
  await expect(response.text()).resolves.toBe('hello world')
})

test('supports throwing an HttpResponse in a response resolver', async ({
  fetch,
}) => {
  const response = await fetch('/throw/http-response')
  expect(response.status()).toBe(200)
  expect(await response.headerValue('Content-Type')).toBe('text/plain')
  await expect(response.text()).resolves.toBe('hello world')
})

test('supports throwing an error response in a response resolver', async ({
  fetch,
}) => {
  const errorResponse = await fetch('/throw/error')
  expect(errorResponse.status()).toBe(400)
  expect(await errorResponse.headerValue('Content-Type')).toBe('text/plain')
  expect(await errorResponse.text()).toBe('invalid input')
})

test('supports throwing a network error in a response resolver', async ({
  page,
  task,
}) => {
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
  expect(networkError?.message).toBe(
    task.file.projectName === 'browser' ? 'Failed to fetch' : 'fetch failed',
  )

  if (task.file.projectName === 'browser') {
    expect(networkError?.cause).toBeUndefined()
  } else {
    expect(networkError?.cause).toBeInstanceOf(Response)
  }
})

test('supports middleware-style responses', async ({ fetch }) => {
  const response = await fetch('/middleware?id=1')
  expect(response.status()).toBe(200)
  await expect(response.text()).resolves.toBe('ok')

  const errorResponse = await fetch('/middleware')
  expect(errorResponse.status()).toBe(400)
  expect(await errorResponse.text()).toBe('must have id')
})

test('throws a non-Response error as-is', async ({ fetch }) => {
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
