import { objectToHeaders } from 'headers-polyfill'
import { ResponseTransformer } from '../response'

export type HeadersObject<KeyType extends string = string> = Record<
  KeyType,
  string | string[]
>

/**
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name
 */
export type ForbiddenHeaderNames =
  | 'cookie'
  | 'cookie2'
  | 'set-cookie'
  | 'set-cookie2'

export type ForbiddenHeaderError<HeaderName extends string> =
  `SafeResponseHeader: the '${HeaderName}' header cannot be set on the response. Please use the 'ctx.cookie()' function instead.`

/**
 * Sets one or multiple response headers.
 * @example
 * ctx.set('Content-Type', 'text/plain')
 * ctx.set({
 *   'Accept': 'application/javascript',
 *   'Content-Type': "text/plain"
 * })
 * @see {@link https://mswjs.io/docs/api/context/set `ctx.set()`}
 */
export function set<N extends string | HeadersObject>(
  ...args: N extends string
    ? Lowercase<N> extends ForbiddenHeaderNames
      ? [ForbiddenHeaderError<N>]
      : [N, string]
    : N extends HeadersObject<infer CookieName>
    ? Lowercase<CookieName> extends ForbiddenHeaderNames
      ? [ForbiddenHeaderError<CookieName>]
      : [N]
    : [N]
): ResponseTransformer {
  return (res) => {
    const [name, value] = args

    if (typeof name === 'string') {
      res.headers.append(name, value as string)
    } else {
      const headers = objectToHeaders(name)
      headers.forEach((value, name) => {
        res.headers.append(name, value)
      })
    }

    return res
  }
}
