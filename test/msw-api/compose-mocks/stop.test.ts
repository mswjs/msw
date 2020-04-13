import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'

describe('API: composeMocks / stop', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'stop.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given a manually stop the service worker', () => {
    beforeAll((done) => {
      const onceUnregistered = test.page.evaluate(() => {
        // @ts-ignore
        return window.__mswStop()
      })

      onceUnregistered.then(() => {
        setTimeout(done, 1000)
      })
    })

    it('should have the mocking disabled', async () => {
      const res = await test.request({
        url: 'https://api.github.com',
      })
      const headers = res.headers()
      const body = res.json()

      expect(headers).not.toHaveProperty('x-powered-by', 'msw')
      expect(body).not.toEqual({
        mocked: true,
      })
    })
  })
})
