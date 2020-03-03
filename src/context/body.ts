import { ResponseTransformer } from '../response'

/**
 * Sets the body of the response without any `Content-Type` header.
 * @example
 * res(body('foo'))
 */
export const body = <T>(value: T): ResponseTransformer => {
  return (res) => {
    res.body = value
    return res
  }
}
