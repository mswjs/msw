import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { captureConsole } from '../../../support/captureConsole'
import { runBrowserWith } from '../../../support/runBrowserWith'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, './quiet.mocks.ts'))
}

test('prints out the console stop message', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    return window.msw.worker.start()
  })

  await runtime.page.evaluate(() => {
    return window.msw.worker.stop()
  })

  expect(messages.log).toContain('[MSW] Mocking disabled.')

  return runtime.cleanup()
})

test('does not print out any console stop message when in "quite" mode', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    return window.msw.worker.start({ quiet: true })
  })

  await runtime.page.evaluate(() => {
    return window.msw.worker.stop()
  })

  expect(messages.log).not.toContain('[MSW] Mocking disabled.')

  return runtime.cleanup()
})
