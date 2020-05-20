import { Headers } from 'headers-utils'
import { pipe } from './utils/internal/pipe'

export interface MockedResponse {
  body: any
  status: number
  statusText: string
  headers: Headers
  delay: number
}

export type ResponseTransformer = (res: MockedResponse) => MockedResponse
export type ResponseComposition = (
  ...transformers: ResponseTransformer[]
) => MockedResponse

export const defaultResponse: Omit<MockedResponse, 'headers'> = {
  status: 200,
  statusText: 'OK',
  body: null,
  delay: 0,
}

export const response: ResponseComposition = (...transformers) => {
  const resolvedResponse: Partial<MockedResponse> = Object.assign(
    {},
    defaultResponse,
    {
      headers: new Headers({
        'x-powered-by': 'msw',
      }),
    },
  )

  if (transformers.length > 0) {
    return pipe(...transformers)(resolvedResponse)
  }

  return resolvedResponse
}
