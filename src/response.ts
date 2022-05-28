import { Headers } from 'headers-polyfill'
import { DefaultBodyType } from './handlers/RequestHandler'
import { compose } from './utils/internal/compose'
import { NetworkError } from './utils/NetworkError'

export type MaybePromise<ValueType = any> = ValueType | Promise<ValueType>

/**
 * Internal representation of a mocked response instance.
 */
export interface MockedResponse<BodyType extends DefaultBodyType = any> {
  body: BodyType
  status: number
  statusText: string
  headers: Headers
  once: boolean
  passthrough: boolean
  delay?: number
}

export type ResponseTransformer<
  BodyType extends TransformerBodyType = any,
  TransformerBodyType = any,
> = (
  res: MockedResponse<TransformerBodyType>,
) => MaybePromise<MockedResponse<BodyType>>

export type ResponseFunction<BodyType = any> = (
  ...transformers: ResponseTransformer<BodyType>[]
) => MaybePromise<MockedResponse<BodyType>>

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
  passthrough: false,
}

export type ResponseCompositionOptions<BodyType> = {
  defaultTransformers?: ResponseTransformer<BodyType>[]
  mockedResponseOverrides?: Partial<MockedResponse>
}

export const defaultResponseTransformers: ResponseTransformer<any>[] = []

export function createResponseComposition<BodyType>(
  responseOverrides?: Partial<MockedResponse<BodyType>>,
  defaultTransformers: ResponseTransformer<BodyType>[] = defaultResponseTransformers,
): ResponseFunction {
  return async (...transformers) => {
    const initialResponse: MockedResponse = Object.assign(
      {},
      defaultResponse,
      {
        headers: new Headers({
          'x-powered-by': 'msw',
        }),
      },
      responseOverrides,
    )

    const resolvedTransformers = [
      ...defaultTransformers,
      ...transformers,
    ].filter(Boolean)

    const resolvedResponse =
      resolvedTransformers.length > 0
        ? compose(...resolvedTransformers)(initialResponse)
        : initialResponse

    return resolvedResponse
  }
}

export const response = Object.assign(createResponseComposition(), {
  once: createResponseComposition({ once: true }),
  networkError(message: string) {
    throw new NetworkError(message)
  },
})
