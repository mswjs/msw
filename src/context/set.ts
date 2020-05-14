import { objectToHeaders } from 'headers-utils'
import { ResponseTransformer } from '../response'

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
