import { store } from '@mswjs/cookies'
import { MockedResponse } from '../../response'
import { MockedRequest } from '../../handlers/RequestHandler'

export function readResponseCookies(
  request: MockedRequest,
  response: MockedResponse,
) {
  store.add({ ...request, url: request.url.toString() }, response)
  store.persist()
}
