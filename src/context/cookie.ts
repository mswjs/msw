import * as cookieUtils from 'cookie'
import { ResponseTransformer } from '../response'

/**
 * Sets a given cookie on the mocked response.
 * @example res(ctx.cookie('name', 'value'))
 */
export const cookie = (
  name: string,
  value: string,
  options?: cookieUtils.CookieSerializeOptions,
): ResponseTransformer => {
  return (res) => {
    const serializedCookie = cookieUtils.serialize(name, value, options)
    res.headers.append('Set-Cookie', serializedCookie)

    if (typeof document !== 'undefined') {
      document.cookie = serializedCookie
    }

    return res
  }
}
