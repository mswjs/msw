import * as R from 'ramda'
import context from './context'

export interface MockedResponse {
  body: any
  status: number
  statusText: string
  headers: Object
  delay: number
}

/**
 * @todo Use proper function signature.
 * (res: MockedResponse) => MockedResponse is the correct one, but
 * it doesn't seem to work properly with Radma's annotations.
 */
export type ResponseTransformer = (res: MockedResponse) => any
export type ResponseComposition = (
  ...transformers: ResponseTransformer[]
) => MockedResponse

const defaultResponse: MockedResponse = {
  status: 200,
  statusText: 'OK',
  body: null,
  delay: 0,
  headers: {
    Mocked: true,
  },
}

const response: ResponseComposition = (...transformers) => {
  const list =
    transformers && transformers.length > 0
      ? transformers
      : [() => defaultResponse]

  return R.pipe(...list)(defaultResponse)
}
// transformers && transformers.length > 0
//? /* tslint:disable-next-line */
// R.pipe(...(transformers || [R.always(defaultResponse)]))(defaultResponse)
// : defaultResponse

export default response
