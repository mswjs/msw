import { ResponseTransformer } from '../response'

export const set = (
  name: Record<string, string> | string,
  value?: string,
): ResponseTransformer => {
  return (res) => {
    if (typeof name === 'object') {
      Object.keys(name).forEach((headerName) => {
        res.headers.append(headerName, name[headerName])
      })
    } else {
      res.headers.append(name, value)
    }

    return res
  }
}
