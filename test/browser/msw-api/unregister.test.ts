import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

test('unregisters itself when not prompted to be activated again', async ({
  loadExample,
  page,
  fetch,
  waitForMswActivation,
}) => {
  const { compilation } = await loadExample(
    new URL('./unregister.mocks.ts', import.meta.url),
    {
      skipActivation: true,
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.get('/resource', (_, res) => {
            res.json({ original: true })
          })
        })
      },
    },
  )

  const resourceUrl = new URL('./resource', compilation.previewUrl).href

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(() => {
    return window.msw.worker.start()
  })
  await waitForMswActivation()

  // Should have the mocking enabled.
  const firstResponse = await fetch(resourceUrl)
  const body = await firstResponse.json()

  expect(firstResponse.fromServiceWorker()).toBe(true)
  expect(body).toEqual({ mocked: true })

  // Reload the page, not starting the worker manually this time.
  await page.reload({ waitUntil: 'networkidle' })

  const secondResponse = await fetch(resourceUrl)
  const secondBody = await secondResponse.json()

  expect(secondResponse.fromServiceWorker()).toBe(false)
  expect(secondBody).toEqual({ original: true })

  // Refresh the page the second time.
  await page.reload()
  const thirdResponse = await fetch(resourceUrl)
  const thirdBody = await thirdResponse.json()

  expect(secondResponse.fromServiceWorker()).toBe(false)
  expect(thirdBody).toEqual({ original: true })
})
