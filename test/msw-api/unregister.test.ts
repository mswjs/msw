import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('Unregister', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'unregister.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given the service worker is manually started', () => {
    beforeAll((done) => {
      const onceRegistered = test.page.evaluate(() => {
        // @ts-ignore
        return window.__mswStart()
      })

      onceRegistered.then(() => {
        /**
         * @fixme Stop relying on side-effects in tests.
         * For no apparent reason, awaiting the registration promise is not enough.
         */
        setTimeout(done, 1000)
      })
    })

    it('should have the mocking enabled', async () => {
      const res = await test.request({
        url: 'https://api.github.com',
      })
      const headers = res.headers()
      const body = await res.json()

      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        mocked: true,
      })
    })

    describe('and I reload the page without starting the service worker', () => {
      beforeAll(async () => {
        await test.page.reload()
      })

      it('should have the service worker unregistered', async () => {
        const res = await test.request({
          url: 'https://api.github.com',
        })
        const body = await res.json()

        expect(res.fromServiceWorker()).toBe(false)
        expect(body).not.toEqual({
          mocked: true,
        })
      })
    })
  })
})
