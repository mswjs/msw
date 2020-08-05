import * as cookieUtils from 'cookie'
import { ResponseTransformer } from '../response'

/**
 * Sets a given cookie on the response.
 * @example
 * res(cookie('name', 'value'))
 */
export const cookie = (
  name: string,
  value: string,
  options?: cookieUtils.CookieSerializeOptions,
): ResponseTransformer => {
  return (res) => {
    const serializedCookie = cookieUtils.serialize(name, value, options)
    res.headers.set('Set-Cookie', serializedCookie)

    if (typeof document !== 'undefined') {
      document.cookie = serializedCookie
    }

    return res
  }
}
