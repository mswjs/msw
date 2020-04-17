import * as path from 'path'
import { Response } from 'puppeteer'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('Unregister', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'unregister.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given I manually start the service worker', () => {
    beforeAll(async () => {
      await test.page.evaluate(() => {
        // @ts-ignore
        return window.__mswStart()
      })

      return new Promise((resolve) => {
        setTimeout(resolve, 1000)
      })
    })

    it('should return a mocked response', async () => {
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
      let res: Response

      beforeAll(async () => {
        await test.page.reload()

        res = await test.request({
          url: 'https://api.github.com',
        })
      })

      // Although the Service Worker unregisters itself upon refreshing the page,
      // it still remains "active and running" with the "deleted" status.
      // This results into requests go through the Service Worker until the next reload.
      it('should still serve the response from Service Worker', () => {
        expect(res.fromServiceWorker()).toBe(true)
      })

      it('should not return a mocked response', async () => {
        const body = await res.json()
        expect(body).not.toEqual({
          mocked: true,
        })
      })

      describe('and I refresh the second time', () => {
        let res: Response

        beforeAll(async () => {
          await test.page.reload()
          res = await test.request({
            url: 'https://api.github.com',
          })
        })

        it('should not serve the response from Service Worker', () => {
          expect(res.fromServiceWorker()).toBe(false)
        })

        it('should not return a mocked response', async () => {
          const body = await res.json()
          expect(body).not.toEqual({
            mocked: true,
          })
        })
      })
    })
  })
})
