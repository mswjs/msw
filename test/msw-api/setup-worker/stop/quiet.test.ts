import { SetupWorkerApi } from 'msw'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

const QUITE_EXAMPLE = require.resolve('./quiet.mocks.ts')

test('prints out the console stop message', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(QUITE_EXAMPLE)

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
  await loadExample(QUITE_EXAMPLE)

  await page.evaluate(() => {
    return window.msw.worker.start({ quiet: true })
  })

  await page.evaluate(() => {
    return window.msw.worker.stop()
  })

  expect(consoleSpy.get('log')).toBeUndefined()
})
