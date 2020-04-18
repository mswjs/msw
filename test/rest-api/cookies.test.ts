import * as path from 'path'
import * as cookieUtils from 'cookie'
import { Response } from 'puppeteer'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Cookies', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'cookies.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given I set cookies on the mocked response', () => {
    let res: Response

    beforeAll(async () => {
      res = await test.request({
        url: `${test.origin}/user`,
      })
    })

    it('should return the mocked response', async () => {
      const headers = res.headers()
      const body = await res.json()

      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        mocked: true,
      })
    })

    it('should not have "Set-Cookie" header on the mocked response', () => {
      const headers = res.headers()

      expect(headers).not.toHaveProperty('set-cookie')
    })

    it('should be able to access response cookies via "document.cookie"', async () => {
      const cookieString = await test.page.evaluate(() => {
        return document.cookie
      })
      const allCookies = cookieUtils.parse(cookieString)

      expect(allCookies).toHaveProperty('my-cookie', 'value')
    })
  })
})
