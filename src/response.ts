import { Headers } from 'headers-utils'
import { compose } from './utils/internal/compose'
import { NetworkError } from './utils/NetworkError'

export interface MockedResponse<BodyType = any> {
  body: BodyType
  status: number
  statusText: string
  headers: Headers
  once: boolean
  delay?: number
}

export type ResponseTransformer<BodyType = any> = (
  res: MockedResponse<BodyType>,
) => MockedResponse<BodyType>
type ResponseFunction<BodyType = any> = (
  ...transformers: ResponseTransformer<BodyType>[]
) => MockedResponse<BodyType>
export type ResponseComposition<BodyType = any> = ResponseFunction<BodyType> & {
  /**
   * Respond using a given mocked response to the first captured request.
   * Does not affect any subsequent captured requests.
   */
  once: ResponseFunction<BodyType>
  networkError: (message: string) => void
}

/**
 * Internal response transformer to ensure response JSON body
 * is always stringified.
 */
const stringifyJsonBody: ResponseTransformer = (res) => {
  if (res.body && res.headers?.get('content-type')?.endsWith('json')) {
    res.body = JSON.stringify(res.body)
  }

  return res
}

export const defaultResponse: Omit<MockedResponse, 'headers'> = {
  status: 200,
  statusText: 'OK',
  body: null,
  delay: 0,
  once: false,
}

export type ResponseCompositionOptions<BodyInit> = {
  defaultTransformers?: ResponseTransformer<BodyInit>[]
  mockedResponseOverrides?: Partial<MockedResponse>
}

export function createResponseComposition<BodyInit>(
  options: ResponseCompositionOptions<BodyInit> = {
    defaultTransformers: [stringifyJsonBody],
    mockedResponseOverrides: {},
  },
): ResponseFunction {
  return (...userTransformers) => {
    const initialResponse: MockedResponse = Object.assign(
      {},
      defaultResponse,
      {
        headers: new Headers({
          'x-powered-by': 'msw',
        }),
      },
      options.mockedResponseOverrides,
    )
    const transformers = [
      ...(options.defaultTransformers ?? [stringifyJsonBody]),
      ...userTransformers,
    ].filter(Boolean)

    const resolvedResponse =
      transformers.length > 0
        ? compose(...transformers)(initialResponse)
        : initialResponse

    return resolvedResponse
  }
}

export const response = Object.assign(createResponseComposition(), {
  once: createResponseComposition({ mockedResponseOverrides: { once: true } }),
  networkError(message: string) {
    throw new NetworkError(message)
  },
})
