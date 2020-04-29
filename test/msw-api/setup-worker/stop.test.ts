import * as path from 'path'
import { Page } from 'puppeteer'
import {
  TestAPI,
  runBrowserWith,
  createRequestHelper,
} from '../../support/runBrowserWith'

const stopWorkerOn = async (page: Page) => {
  await page.evaluate(() => {
    // @ts-ignore
    return window.__mswStop()
  })

  return new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
}

describe('API: setupWorker / stop', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'stop.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given I manually stop the service worker', () => {
    beforeAll(async () => {
      await stopWorkerOn(test.page)
    })

    afterAll(async () => {
      await test.page.close()
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

  describe('given multiple clients of the same project', () => {
    let firstPage: Page
    let secondPage: Page

    beforeAll(async () => {
      firstPage = await test.browser.newPage()
      await firstPage.goto(test.origin, {
        waitUntil: 'networkidle0',
      })

      secondPage = await test.browser.newPage()
      await secondPage.goto(test.origin, {
        waitUntil: 'networkidle0',
      })
    })

    describe('when I stop the service worker on one page', () => {
      beforeAll(async () => {
        await stopWorkerOn(firstPage)
      })

      describe('and switch to another page', () => {
        beforeAll(async () => {
          await secondPage.bringToFront()
        })

        it('should still have mocking enabled', async () => {
          // Creating a request handler for the new page
          const request = createRequestHelper(secondPage)
          const res = await request({
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
})
