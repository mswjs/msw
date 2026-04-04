import type { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

test('prints an error if stopping the worker throws', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  await loadExample(new URL('./unhandled-exception.mocks.ts', import.meta.url))
  const consoleSpy = spyOnConsole()
  await page.waitForFunction(() => typeof window.msw === 'object')

  await page.evaluate(async () => {
    /**
     * @note This is implementation detail mocking because there's no
     * other way to trigger ".stop()" to throw. It only resets the internal state.
     * This entire behavior is a fool-proof mechanism for an edge case.
     */
    window.postMessage = () => {
      throw new Error('Cannot post message')
    }

    window.msw.worker.stop()
  })

  await expect
    .poll(() => consoleSpy.get('error'))
    .toEqual([
      '[MSW] Failed to call "stop" on setupWorker: Error: Cannot post message',
    ])
})
