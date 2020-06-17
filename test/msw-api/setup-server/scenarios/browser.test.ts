import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

describe('API: setupWorker / start', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'browser.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  it('log an error to the console', async () => {
    const errors: string[] = []

    captureConsole(test.page, errors, (message) => {
      return message.type() === 'error'
    })

    await test.reload()

    const nodeMessage = errors.find((message) => {
      return message.startsWith(
        '[MSW] Failed to execute `setupServer` in the environment that is not NodeJS',
      )
    })

    expect(nodeMessage).toBeTruthy()
  })
})
