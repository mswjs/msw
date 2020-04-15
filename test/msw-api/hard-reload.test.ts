import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('Hard reload', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'hard-reload.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given I load the page that activates the Service Worker', () => {
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

    describe('when I hard reload the page', () => {
      beforeAll(async () => {
        // Passing `true` to `location.reload()` forces a hard reload
        test.page.evaluate(() => location.reload(true))

        await test.page.waitForNavigation({
          waitUntil: 'networkidle0',
        })
      })

      it('should still have the mocking enabled', async () => {
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
    })
  })
})
