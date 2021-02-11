import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, './quiet.mocks.ts'),
  })
}

test('prints out the console stop message', async () => {
  const { page, consoleSpy } = await createRuntime()

  await page.evaluate(() => {
    return window.msw.worker.start()
  })

  await page.evaluate(() => {
    return window.msw.worker.stop()
  })

  expect(consoleSpy.get('log')).toContain('[MSW] Mocking disabled.')
})

test('does not print out any console stop message when in "quite" mode', async () => {
  const { page, consoleSpy } = await createRuntime()

  await page.evaluate(() => {
    return window.msw.worker.start({ quiet: true })
  })

  await page.evaluate(() => {
    return window.msw.worker.stop()
  })

  expect(consoleSpy.get('log')).toBeUndefined()
})
