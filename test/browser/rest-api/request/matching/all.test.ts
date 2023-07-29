/**
 * @jest-environment node
 */
import { Response } from '@playwright/test'
import { test, expect } from '../../../playwright.extend'

function forEachMethod(
  callback: (method: string) => Promise<Response>,
): Promise<Response[]> {
  return Promise.all(
    ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].map((method) =>
      callback(method),
    ),
  )
}

test('respects custom path when matching requests', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./all.mocks.ts'))

  // Root request.
  const rootResponses = await forEachMethod((method) => {
    return fetch('http://localhost/api/', { method })
  })

  for (const response of rootResponses) {
    expect(response.status()).toEqual(200)
    expect(await response.text()).toEqual('hello world')
  }

  // Nested request.
  const nestedResponses = await forEachMethod((method) => {
    return fetch('http://localhost/api/user', { method })
  })

  for (const response of nestedResponses) {
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe('hello world')
  }

  // Mismatched request.
  // There's a fallback "http.all()" in this test that acts
  // as a fallback request handler for all otherwise mismatched requests.
  const mismatchedResponses = await forEachMethod((method) => {
    return fetch('http://localhost/foo', { method })
  })

  for (const response of mismatchedResponses) {
    expect(response.status()).toEqual(200)
    expect(await response.text()).toEqual('welcome to the jungle')
  }
})
