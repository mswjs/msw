import { ResponseTransformer } from '../response'

/**
 * Sets the given value as the JSON body of the response.
 * @example
 * res(json({ foo: 'bar' }))
 * res(json('Some string'))
 * res(json([1, '2', false, { ok: true }]))
 */
export const json = (body: any): ResponseTransformer => {
  return (res) => {
    res.headers.set('Content-Type', 'application/json')
    res.body = JSON.stringify(body)
    return res
  }
}
