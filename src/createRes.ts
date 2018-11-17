import * as R from 'ramda'

export interface ResponseMock {
  readonly headers: Object
  readonly body: any
  readonly statusCode: number
  readonly statusText: string
  readonly timeout: number

  set(name: string | Object, value?: any): ResponseMock
  status(statusCode: number, statusText: string): ResponseMock
  delay(duration: number): ResponseMock

  text(body: string): ResponseMock
  json(body: Object): ResponseMock
  xml(body: string): ResponseMock
}

const createRes = (): ResponseMock => ({
  headers: {
    Mocked: true,
  },
  body: null,
  statusCode: 200,
  statusText: 'OK',
  timeout: 0,
  set(name, value) {
    this.headers = R.ifElse(
      R.always(R.is(Object, name)),
      R.mergeDeepLeft(name),
      R.assoc(name, value)
    )(this.headers)

    return this
  },
  status(statusCode, statusText) {
    this.statusCode = statusCode
    this.statusText = statusText
    return this
  },
  text(body) {
    this.body = body
    this.set('Content-Type', 'text/plain')
    return this
  },
  json(body) {
    this.body = JSON.stringify(body)
    this.set('Content-Type', 'application/json')
    return this
  },
  xml(body) {
    this.body = body
    this.set('Content-Type', 'text/xml')
    return this
  },
  delay(duration) {
    this.timeout = duration
    return this
  }
})

export default createRes
