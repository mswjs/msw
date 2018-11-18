import * as R from 'ramda'

/**
 * Sets the given header, or the Map of headers to the response.
 * @example
 * res(set('Content-Type', 'plain/text'))
 * res(set({ 'Content-Type': 'plain/text', 'My-Header': 'foo' }))
 */
export const set = (name: string | Object, value?: string) => {
  return R.ifElse(
    R.always(R.is(Object, name)),
    R.mergeDeepLeft({ headers: name }),
    R.assocPath(['headers', name], value),
  )
}

/**
 * Sets a status code and optional status text of the response.
 * @example
 * res(status(301)) // status code only
 * res(status(200, 'Fine')) // with status code
 */
export const status = (statusCode: number, statusText?: string) => {
  return R.compose(
    R.assoc('status', statusCode),
    R.when(
      R.complement(R.always(R.isNil(statusText))),
      R.assoc('statusText', statusText),
    ),
  )
}

/**
 * Sets the given text as the body of the response.
 * @example
 * res(text('Message'))
 */
export const text = (body: string) => {
  return R.compose(
    R.assoc('body', body),
    set('Content-Type', 'text/plain'),
  )
}

/**
 * Sets the given XML as the body of the response.
 * @example
 * res(xml('<message>Foo</message>'))
 */
export const xml = (body: string) => {
  return R.compose(
    R.assoc('body', body),
    set('Content-Type', 'text/xml'),
  )
}

/**
 * Sets the given Object as the JSON body of the response.
 * @example
 * res(json({ foo: 'bar' }))
 */
export const json = (body: Object) => {
  return R.compose(
    R.assoc('body', JSON.stringify(body)),
    set('Content-Type', 'application/json'),
  )
}

/**
 * Delays the current response for the given duration (in ms)
 * @example
 * res(delay(1500), json({ foo: 'bar' }))
 */
export const delay = (duration: number) => {
  return R.assoc('delay', duration)
}
