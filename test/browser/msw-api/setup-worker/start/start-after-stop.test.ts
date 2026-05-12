/**
 * @see https://github.com/mswjs/msw/issues/2714
 */
import { test, expect } from '../../../playwright.extend'

declare global {
  interface Window {
    msw: {
      worker: import('msw/browser').SetupWorker
    }
  }
}

test('handles requests after starting a stopped worker', async ({
  loadExample,
  page,
  fetch,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./start-after-stop.mocks.ts', import.meta.url))

  await page.evaluate(async () => {
    await window.msw.worker.stop()
  })

  expect(consoleSpy.get('log')).toEqual(
    expect.arrayContaining(['[MSW] Mocking disabled.']),
  )

  await page.evaluate(async () => {
    await window.msw.worker.start()
  })

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining(['[MSW] Mocking enabled.']),
  )

  const response = await fetch('/resource')
  expect.soft(response.status()).toBe(200)
  await expect(response.text()).resolves.toBe('hello world')
})
