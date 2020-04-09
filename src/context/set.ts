import { ResponseTransformer } from '../response'

export const set = (
  name: Record<string, string> | Record<string, string[]> | string,
  value?: string,
): ResponseTransformer => {
  return (res) => {
    if (typeof name === 'object') {
      Object.keys(name).forEach((headerName) => {
        const headerValues = [].concat(name[headerName])

        headerValues.forEach((headerValue) => {
          res.headers.append(headerName, headerValue)
        })
      })
    } else {
      res.headers.append(name, value)
    }

    return res
  }
}
