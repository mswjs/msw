import type { SetupWorkerApi } from '../../../../../src/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

test.beforeEach(() => {
  test.setTimeout(5000)
})

test('resolves in-flight request even if the worker was stopped', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./in-flight-request.mocks.ts', import.meta.url))

  const dataPromise = page.evaluate<string>(() => {
    return fetch('/resource').then((response) => response.text())
  })

  await page.evaluate(() => {
    window.msw.worker.stop()
  })

  await expect(dataPromise).resolves.toBe('hello world')
})

test.skip('bypasses in-flight request made after the worker was stopped', async ({
  loadExample,
  fetch,
}) => {})
