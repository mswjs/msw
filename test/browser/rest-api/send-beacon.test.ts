import { test, expect } from '../playwright.extend'

test('supports mocking a response to a "sendBeacon" request', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./send-beacon.mocks.ts', import.meta.url))

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
  loadExample,
  page,
}) => {
  const { compilation } = await loadExample(
    new URL('./send-beacon.mocks.ts', import.meta.url),
    {
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.post('/analytics-bypass', (_req, res) => {
            res.status(200).end()
          })
        })
      },
    },
  )

  const url = new URL('./analytics-bypass', compilation.previewUrl).href
  const isQueuedPromise = page.evaluate((url) => {
    return navigator.sendBeacon(url, JSON.stringify({ event: 'pageview' }))
  }, url)

  const response = await page.waitForResponse(url)
  expect(response.status()).toBe(200)

  await expect(isQueuedPromise).resolves.toBe(true)
})
