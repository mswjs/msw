import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

describe('API: setupWorker / start', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'start.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given a custom Promise chain handler to worker.start()', () => {
    let resolvedPayload

    beforeAll(async () => {
      resolvedPayload = await test.page.evaluate(() => {
        // @ts-ignore
        return window.__MSW_REGISTRATION__
      })
    })

    it('should return instance of ServiceWorkerRegistration', () => {
      expect(resolvedPayload).toBe('ServiceWorkerRegistration')
    })

    it('should resolve after the mocking has been activated', async () => {
      const logs: string[] = []

      captureConsole(test.page, logs, (message) => {
        return ['startGroupCollapsed', 'log'].includes(message.type())
      })

      await test.reload()

      const activationMessageIndex = logs.findIndex((message) => {
        return message.includes('[MSW] Mocking enabled')
      })

      const customMessageIndex = logs.findIndex((message) => {
        return message.includes('Registration Promise resolved')
      })

      expect(activationMessageIndex).toBeGreaterThan(-1)
      expect(customMessageIndex).toBeGreaterThan(-1)
      expect(customMessageIndex).toBeGreaterThan(activationMessageIndex)
    })
  })
})
