import type { IsomorphicRequest } from '@mswjs/interceptors'
import { MockedRequest } from '../../handlers/RequestHandler'
import { setRequestCookies } from './setRequestCookies'

/**
 * Converts a given isomorphic request to a `MockedRequest` instance.
 */
export function parseIsomorphicRequest(
  request: IsomorphicRequest,
): MockedRequest {
  const mockedRequest = new MockedRequest(request)

  // Attach all the cookies from the virtual cookie store.
  setRequestCookies(mockedRequest)

  return mockedRequest
}
