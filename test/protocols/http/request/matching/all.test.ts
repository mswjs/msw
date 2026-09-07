import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

function forEachMethod<ResponseType>(
  callback: (method: string) => Promise<ResponseType>,
): Promise<Array<ResponseType>> {
  return Promise.all(
    ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].map((method) =>
      callback(method),
    ),
  )
}

const handlers = [
  http.all('*/api/*', () => {
    return HttpResponse.text('hello world')
  }),
  http.all('*', () => {
    return HttpResponse.text('welcome to the jungle')
  }),
]

const test = defineNetwork({ handlers })

test('respects custom path when matching requests', async ({ fetch }) => {
  // Root request.
  const rootResponses = await forEachMethod((method) => {
    return fetch('http://localhost/api/', { method })
  })

  for (const response of rootResponses) {
    expect(response.status()).toEqual(200)
    await expect(response.text()).resolves.toEqual('hello world')
  }

  // Nested request.
  const nestedResponses = await forEachMethod((method) => {
    return fetch('http://localhost/api/user', { method })
  })

  for (const response of nestedResponses) {
    expect(response.status()).toBe(200)
    await expect(response.text()).resolves.toBe('hello world')
  }

  // Mismatched request.
  // There's a fallback "http.all()" in this test that acts
  // as a fallback request handler for all otherwise mismatched requests.
  const mismatchedResponses = await forEachMethod((method) => {
    return fetch('http://localhost/foo', { method })
  })

  for (const response of mismatchedResponses) {
    expect(response.status()).toEqual(200)
    await expect(response.text()).resolves.toEqual('welcome to the jungle')
  }
})
