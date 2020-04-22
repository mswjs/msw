import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'

describe('API: composeMocks / start', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'start.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given a custom Promise chain handler to start()', () => {
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

      test.page.on('console', function (message) {
        if (message.type() === 'log') {
          logs.push(message.text())
        }
      })

      await test.page.goto(test.origin, {
        waitUntil: 'networkidle0',
      })

      const activationMessageIndex = logs.findIndex((log) => {
        return log.startsWith('[MSW] Mocking enabled')
      })

      const customMessageIndex = logs.findIndex((log) => {
        return log.startsWith('Registration Promise resolved')
      })

      expect(customMessageIndex).toBeGreaterThan(activationMessageIndex)
    })
  })
})
