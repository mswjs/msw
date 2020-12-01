import { objectToHeaders } from 'headers-utils'
import { ResponseTransformer } from '../response'

/**
 * Sets one or multiple response headers.
 * @see {@link https://mswjs.io/docs/api/context/set `ctx.set()`}
 */
export function set<N extends string | Record<string, string | string[]>>(
  ...args: N extends string ? [N, string] : [N]
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
