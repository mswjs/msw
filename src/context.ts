import * as R from 'ramda'
import { MockedResponse, ResponseTransformer } from './response'

export interface MockedContext {
  /**
   * Sets the given header, or the Map of headers to the response.
   * @example
   * res(set('Content-Type', 'plain/text'))
   * res(set({ 'Content-Type': 'plain/text', 'My-Header': 'foo' }))
   */
  set: (name: string | Object, value?: string) => ResponseTransformer

  /**
   * Sets a status code and optional status text of the response.
   * @example
   * res(status(301)) // status code only
   * res(status(200, 'Fine')) // with status code
   */
  status: (statusCode: number, statusText?: string) => ResponseTransformer

  /**
   * Sets the body of the response to anything.
   * @example
   * res(body('foo'))
   */
  body: (value: any) => ResponseTransformer

  /**
   * Sets the given text as the body of the response.
   * @example
   * res(text('Message'))
   */
  text: (body: string) => ResponseTransformer

  /**
   * Sets the given XML as the body of the response.
   * @example
   * res(xml('<message>Foo</message>'))
   */
  xml: (body: string) => ResponseTransformer

  /**
   * Sets the given Object as the JSON body of the response.
   * @example
   * res(json({ foo: 'bar' }))
   */
  json: (body: Object) => ResponseTransformer

  /**
   * Delays the current response for the given duration (in ms)
   * @example
   * res(delay(1500), json({ foo: 'bar' }))
   */
  delay: (duration: number) => ResponseTransformer
}

const context: MockedContext = {
  set: (name, value) =>
    R.ifElse(
      R.always(R.is(Object, name)),
      R.mergeDeepLeft({ headers: name }),
      R.assocPath(['headers', name as string], value),
    ),
  status: (statusCode, statusText) =>
    R.compose(
      R.assoc('status', statusCode),
      R.when(
        R.complement(R.always(R.isNil(statusText))),
        R.assoc('statusText', statusText),
      ),
    ),
  body: (value) => R.assoc('body', value),
  text: (body) =>
    R.compose(
      this.body(body),
      this.set('Content-Type', 'text/plain'),
    ),
  xml: (body) =>
    R.compose(
      this.body(body),
      this.set('Content-Type', 'text/xml'),
    ),
  json: (body) =>
    R.compose(
      this.body(JSON.stringify(body)),
      this.set('Content-Type', 'application/json'),
    ),
  delay: (duration) => R.assoc('delay', duration),
}

export default context
