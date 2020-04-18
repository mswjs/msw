import cookieUtils, { CookieSerializeOptions } from 'cookie'
import { ResponseTransformer } from '../response'

/**
 * Sets a given cookie on the response.
 * @example
 * res(cookie('name', 'value'))
 */
export const cookie = (
  name: string,
  value: string,
  options?: CookieSerializeOptions,
): ResponseTransformer => {
  return (res) => {
    const serializedCookie = cookieUtils.serialize(name, value, options)
    res.headers.set('Set-Cookie', serializedCookie)
    document.cookie = serializedCookie
    return res
  }
}
