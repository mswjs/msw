import { ResponseTransformer } from '../response'

/**
 * Sets the given value as the JSON body of the response.
 * @example
 * res(json({ key: 'value' }))
 * res(json('Some string'))
 * res(json([1, '2', false, { ok: true }]))
 */
export const json = <BodyTypeJSON>(
  body: BodyTypeJSON,
): ResponseTransformer<string> => {
  return (res) => {
    res.headers.set('Content-Type', 'application/json')
    res.body = JSON.stringify(body)

    return res
  }
}
