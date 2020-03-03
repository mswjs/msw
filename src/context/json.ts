import { ResponseTransformer } from '../response'

/**
 * Sets the given Object as the JSON body of the response.
 * @example
 * res(json({ foo: 'bar' }))
 */
export const json = (body: Record<string, any>): ResponseTransformer => {
  return (res) => {
    res.headers.set('Content-Type', 'application/json')
    res.body = JSON.stringify(body)
    return res
  }
}
