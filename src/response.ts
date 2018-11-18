import * as R from 'ramda'

export interface MockedResponse {
  body: any
  status: number
  statusText: string
  headers: Object
  delay: number
}

type ResponseTransformer = (res: MockedResponse) => MockedResponse

const defaultResponse: MockedResponse = {
  status: 200,
  statusText: 'OK',
  body: null,
  delay: 0,
  headers: {
    Mocked: true,
  },
}

export default function response(...transformers: ResponseTransformer[]) {
  return R.pipe(...transformers)(defaultResponse)
}
