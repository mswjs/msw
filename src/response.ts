import { Headers } from 'headers-utils'
import { compose } from './utils/internal/compose'

export interface MockedResponse {
  body: any
  status: number
  statusText: string
  headers: Headers
  once: boolean
  delay?: number
}

export type ResponseTransformer = (res: MockedResponse) => MockedResponse
type ResponseFunction = (
  ...transformers: ResponseTransformer[]
) => MockedResponse
export type ResponseComposition = ResponseFunction & {
  /**
   * Respond using a given mocked response to the first captured request.
   * Does not affect any subsequent captured requests.
   */
  once: ResponseFunction
  networkError: (message: string) => void
}

export const defaultResponse: Omit<MockedResponse, 'headers'> = {
  status: 200,
  statusText: 'OK',
  body: null,
  delay: 0,
  once: false,
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
      return compose(...transformers)(resolvedResponse)
    }

    return resolvedResponse
  }
}

export const response: ResponseComposition = Object.assign(
  createResponseComposition(),
  {
    once: createResponseComposition({ once: true }),
    networkError(message: string) {
      Promise.reject(new Error(message))
    },
  },
)
