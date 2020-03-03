import { ResponseTransformer } from '../response'

/**
 * Sets the given text as the body of the response.
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
