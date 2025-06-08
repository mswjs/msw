import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

const QUIET_EXAMPLE = new URL('./quiet.mocks.ts', import.meta.url)

test('prints out the console stop message', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(QUIET_EXAMPLE, {
    // Because the worker is started within the test.
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(() => {
    return window.msw.worker.start()
  })

  await page.evaluate(() => {
    return window.msw.worker.stop()
  })

  expect(consoleSpy.get('log')).toContain('[MSW] Mocking disabled.')
})

test('does not print out any console stop message when in "quite" mode', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(QUIET_EXAMPLE, {
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(() => {
    return window.msw.worker.start({ quiet: true })
  })

  await page.evaluate(() => {
    return window.msw.worker.stop()
  })

  expect(consoleSpy.get('log')).toBeUndefined()
})
