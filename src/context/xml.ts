import { ResponseTransformer } from '../response'

/**
 * Sets the given XML as the body of the response.
 * @example
 * res(xml('<key>value</key>'))
 */
export const xml = <BodyType extends string>(
  body: BodyType,
): ResponseTransformer<BodyType> => {
  return (res) => {
    res.headers.set('Content-Type', 'text/xml')
    res.body = body
    return res
  }
}
