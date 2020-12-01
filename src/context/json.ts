import { ResponseTransformer } from '../response'

/**
 * Sets the given value as the JSON body of the response.
 * Appends a `Content-Type: application/json` header on the
 * mocked response.
 * @example
 * res(ctx.json('Some string'))
 * res(ctx.json({ key: 'value' }))
 * res(ctx.json([1, '2', false, { ok: true }]))
 * @see {@link https://mswjs.io/docs/api/context/json `ctx.json()`}
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
