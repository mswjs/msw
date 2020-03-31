import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'

describe('API: composeMocks / start', () => {
  let api: TestAPI

  beforeAll(async () => {
    api = await runBrowserWith(path.resolve(__dirname, 'start.mocks.ts'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  describe('given a custom Promise chain handler to start()', () => {
    let resolvedPayload

    beforeAll(async () => {
      resolvedPayload = await api.page.evaluate(() => {
        // @ts-ignore
        return window.__MSW_REGISTRATION__
      })
    })

    it('should return instance of ServiceWorkerRegistration', () => {
      expect(resolvedPayload).toBe('ServiceWorkerRegistration')
    })

    it('should resolve after the mocking has been activated', async () => {
      const logs: string[] = []

      api.page.on('console', function(message) {
        if (message.type() === 'log') {
          logs.push(message.text())
        }
      })

      await api.page.goto(api.origin, {
        waitUntil: 'networkidle0',
      })

      const activationMessageIndex = logs.findIndex((text) => {
        return text.startsWith('[MSW] Mocking enabled')
      })

      const customMessageIndex = logs.findIndex((text) => {
        return text.startsWith('Registration Promise resolved')
      })

      expect(customMessageIndex).toBeGreaterThan(activationMessageIndex)
    })
  })
})
