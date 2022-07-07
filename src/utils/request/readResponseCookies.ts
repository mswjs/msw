import { store } from '@mswjs/cookies'
import { MockedResponse } from '../../response'
import { MockedRequest } from './MockedRequest'

export function readResponseCookies(
  request: MockedRequest,
  response: MockedResponse,
) {
  store.add({ ...request, url: request.url.toString() }, response)
  store.persist()
}
