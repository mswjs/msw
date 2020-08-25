import { ResponseTransformer } from '../response'

/**
 * Sets the body of the response without any `Content-Type` header.
 * @example
 * res(body('message'))
 */
export const body = <
  BodyType extends string | Blob | BufferSource | ReadableStream | FormData
>(
  value: BodyType,
): ResponseTransformer<BodyType> => {
  return (res) => {
    res.body = value
    return res
  }
}
