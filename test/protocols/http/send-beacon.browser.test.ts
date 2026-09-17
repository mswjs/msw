import { http, bypass } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.post('/analytics', ({ request }) => {
    return new Response(request.body)
  }),
  http.post('*/analytics-bypass', ({ request }) => {
    const nextRequest = bypass(request)
    return fetch(nextRequest)
  }),
]

const test = defineNetwork({ handlers })

test('supports mocking a response to a "sendBeacon" request', async ({
  page,
}) => {
  const isQueuedPromise = page.evaluate(() => {
    return navigator.sendBeacon(
      '/analytics',
      JSON.stringify({ event: 'pageview' }),
    )
  })

  const response = await page.waitForResponse((response) => {
    return response.url().endsWith('/analytics')
  })

  expect(response.status()).toBe(200)
  // Technically, "sendBeacon" responses don't send any body back.
  // We use this body only to verify that the request body was accessible
  // in the request handlers.
  await expect(response.text()).resolves.toBe('{"event":"pageview"}')

  // Must return true, indicating that the server has queued the sent data.
  await expect(isQueuedPromise).resolves.toBe(true)
})

test('supports bypassing "sendBeacon" requests', async ({
  page,
  testServer,
}) => {
  const url = testServer.http.url('/analytics-bypass').href
  const isQueuedPromise = page.evaluate((url) => {
    return navigator.sendBeacon(url, JSON.stringify({ event: 'pageview' }))
  }, url)

  const response = await page.waitForResponse(url)
  expect(response.status()).toBe(0)

  await expect(isQueuedPromise).resolves.toBe(true)
})
