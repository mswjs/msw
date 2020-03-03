import { ResponseTransformer } from '../response'

/**
 * Sets the given XML as the body of the response.
 * @example
 * res(xml('<message>Foo</message>'))
 */
export const xml = (body: string): ResponseTransformer => {
  return (res) => {
    res.headers.set('Content-Type', 'text/xml')
    res.body = body
    return res
  }
}
