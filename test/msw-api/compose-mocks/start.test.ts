import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'
import { resolvePtr } from 'dns'

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
  })
})
