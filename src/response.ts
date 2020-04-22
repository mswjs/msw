import { pipe } from './utils/pipe'

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
  const headers = new Headers({
    'x-powered-by': 'msw',
  })

  const initialResponse: MockedResponse = {
    ...defaultResponse,
    headers,
  }

  if (transformers.length > 0) {
    return pipe(...transformers)(initialResponse)
  }

  return initialResponse
}
