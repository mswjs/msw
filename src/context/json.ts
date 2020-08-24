import { ResponseTransformer } from '../response'

type JsonArray = (JsonValue | JsonRecord)[]
type JsonRecord = Record<string, unknown>
type JsonValue = string | boolean | number | JsonRecord | JsonArray | null

/**
 * Sets the given Object as the JSON body of the response.
 * @example
 * res(json({ foo: 'bar' }))
 * res(json('Some string'))
 * res(json([1, '2', false, { ok: true }]))
 */
export const json = (body: JsonValue): ResponseTransformer => {
  return (res) => {
    res.headers.set('Content-Type', 'application/json')
    res.body = JSON.stringify(body)
    return res
  }
}
