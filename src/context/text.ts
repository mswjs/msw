import { ResponseTransformer } from '../response'

/**
 * Sets a given text as a "Cotent-Type: text/plain" body of the response.
 * @example
 * res(text('Message'))
 */
export const text = (body: string): ResponseTransformer => {
  return (res) => {
    res.headers.set('Content-Type', 'text/plain')
    res.body = body
    return res
  }
}
