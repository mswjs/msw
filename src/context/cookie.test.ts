import * as cookieUtils from 'cookie'
import { cookie } from './cookie'
import { response } from '../response'

describe('cookie', () => {
  describe('given I set a cookie', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(cookie('my-cookie', 'arbitrary-value'))
    })

    it('should be set on the response headers', () => {
      expect(result.headers.get('set-cookie')).toEqual(
        'my-cookie=arbitrary-value',
      )
    })

    it('should set the cookie on "document.cookie"', () => {
      const allCookies = cookieUtils.parse(document.cookie)
      expect(allCookies).toHaveProperty('my-cookie', 'arbitrary-value')
    })
  })
})
