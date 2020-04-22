import { ResponseTransformer } from '../response'

export function set<N extends string | Record<string, string | string[]>>(
  ...args: N extends string ? [N, string] : [N]
): ResponseTransformer {
  return (res) => {
    const [name, value] = args

    if (typeof name === 'string') {
      res.headers.append(name, value as string)
    } else {
      Object.keys(name).forEach((headerName) => {
        const headerValues = ([] as string[]).concat(name[headerName])

        headerValues.forEach((headerValue) => {
          res.headers.append(headerName, headerValue)
        })
      })
    }

    return res
  }
}

set('foo', 'bar')
set({ foo: 'bar' })
set({ foo: ['bar', 'doe'] })
