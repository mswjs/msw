import { ResponseTransformer } from '../response'

/**
 * Sets a given text as a "Cotent-Type: text/plain" body of the response.
 * @example
 * res(text('message'))
 */
export const text = <BodyType extends string>(
  body: BodyType,
): ResponseTransformer<BodyType> => {
  return (res) => {
    res.headers.set('Content-Type', 'text/plain')
    res.body = body
    return res
  }
}
