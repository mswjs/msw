import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'

describe('API: setupWorker / start', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'browser.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  it('log an error to the console', async () => {
    const exceptions: string[] = []

    test.page.on('pageerror', (error) => {
      exceptions.push(error.message)
    })
    await test.reload()

    const nodeMessage = exceptions.find((message) => {
      return message.startsWith(
        'Error: [MSW] Failed to execute `setupServer` in the environment that is not NodeJS',
      )
    })

    expect(nodeMessage).toBeTruthy()
  })
})
