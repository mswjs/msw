/**
 * @jest-environment jsdom
 */
import * as cookieUtils from 'cookie'
import { cookie } from './cookie'
import { response } from '../response'

test('sets a given cookie on the response', async () => {
  const result = await response(cookie('my-cookie', 'arbitrary-value'))

  expect(result.headers.get('set-cookie')).toEqual('my-cookie=arbitrary-value')

  // Propagates the response cookies on the document.
  const allCookies = cookieUtils.parse(document.cookie)
  expect(allCookies).toHaveProperty('my-cookie', 'arbitrary-value')
})
