import type { setupWorker } from 'msw/browser'
import { test, expect } from '../../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
  }
}

test('throws an error when calling "setupWorker()" more than once on the same page', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./multiple-instances.mocks.ts', import.meta.url), {
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  const errorMessage = await page.evaluate(() => {
    window.msw.setupWorker()

    try {
      window.msw.setupWorker()
      return null
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })

  expect(errorMessage).toContain(
    '[MSW] Failed to execute `setupWorker()` more than once',
  )
})
