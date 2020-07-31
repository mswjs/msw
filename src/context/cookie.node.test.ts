/**
 * @jest-environment node
 */
import { cookie } from './cookie'
import { response } from '../response'

describe('cookie (Node.js without jsdom)', () => {
  describe('given I set a cookie', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(cookie('my-cookie', 'arbitrary-value'))
      expect(result).toBeDefined()
    })

    it('should be set on the response headers', () => {
      expect(result.headers.get('set-cookie')).toEqual(
        'my-cookie=arbitrary-value',
      )
    })
  })
})
