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

export const defaultResponse: Omit<MockedResponse, 'headers'> = {
  status: 200,
  statusText: 'OK',
  body: null,
  delay: 0,
  once: false,
}

const postProcessJSONBody = <T = Partial<MockedResponse>>(response: T): T => {
  if (response.headers.get('content-type')?.endsWith('json')) {
    response.body = JSON.stringify(response.body)
  }

  return response
}

function createResponseComposition(
  overrides: Partial<MockedResponse> = {},
): ResponseFunction {
  return (...transformers) => {
    const resolvedResponse: Partial<MockedResponse> = Object.assign(
      {},
      defaultResponse,
      {
        headers: new Headers({
          'x-powered-by': 'msw',
        }),
      },
      overrides,
    )

    if (transformers.length > 0) {
      return postProcessJSONBody(compose(...transformers)(resolvedResponse))
    }

    return resolvedResponse
  }
}

export const response = Object.assign(createResponseComposition(), {
  once: createResponseComposition({ once: true }),
  networkError(message: string) {
    throw new NetworkError(message)
  },
})
