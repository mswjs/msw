import { ResponseTransformer } from '../response'

/**
 * Sets a raw response body. Does not append any `Content-Type` headers.
 * @example
 * res(ctx.body('Successful response'))
 * res(ctx.body(JSON.stringify({ key: 'value' })))
 * @see {@link https://mswjs.io/docs/api/context/body `ctx.body()`}
 */
export const body = <
  BodyType extends string | Blob | BufferSource | ReadableStream | FormData,
>(
  value: BodyType,
): ResponseTransformer<BodyType> => {
  return (res) => {
    res.body = value
    return res
  }
}
