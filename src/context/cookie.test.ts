/**
 * @jest-environment jsdom
 */
import * as cookieUtils from 'cookie'
import { cookie } from './cookie'
import { response } from '../response'
import { clearCookies } from '../../test/support/utils'

beforeAll(() => {
  clearCookies()
})

afterEach(() => {
  clearCookies()
})

test('sets a given response cookie', async () => {
  const result = await response(cookie('myCookie', 'value'))

  expect(result.headers.get('set-cookie')).toBe('myCookie=value')

  // Propagates the response cookies on the document.
  const allCookies = cookieUtils.parse(document.cookie)
  expect(allCookies).toEqual({ myCookie: 'value' })
})

test('supports setting multiple response cookies', async () => {
  const result = await response(
    cookie('firstCookie', 'yes'),
    cookie('secondCookie', 'no'),
  )

  expect(result.headers.get('set-cookie')).toBe(
    'secondCookie=no, firstCookie=yes',
  )

  const allCookies = cookieUtils.parse(document.cookie)
  expect(allCookies).toEqual({ firstCookie: 'yes', secondCookie: 'no' })
})
