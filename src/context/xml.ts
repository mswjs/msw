import { ResponseTransformer } from '../response'

/**
 * Sets an XML response body. Appends a `Content-Type: text/xml` header
 * on the mocked response.
 * @example
 * res(ctx.xml('<node key="value">Content</node>'))
 * @see {@link https://mswjs.io/docs/api/context/xml `ctx.xml()`}
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
