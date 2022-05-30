import type { IsomorphicRequest } from '@mswjs/interceptors'
import { MockedRequest, passthrough } from '../../handlers/RequestHandler'
import { parseBody } from './parseBody'
import { setRequestCookies } from './setRequestCookies'

/**
 * Converts a given isomorphic request to a `MockedRequest` instance.
 */
export function parseIsomorphicRequest(
  request: IsomorphicRequest,
): MockedRequest {
  const mockedRequest: MockedRequest = {
    id: request.id,
    url: request.url,
    method: request.method,
    body: parseBody(request.body, request.headers),
    credentials: request.credentials || 'same-origin',
    headers: request.headers,
    cookies: {},
    redirect: 'manual',
    referrer: '',
    keepalive: false,
    cache: 'default',
    mode: 'cors',
    referrerPolicy: 'no-referrer',
    integrity: '',
    destination: 'document',
    bodyUsed: false,
    passthrough,
  }

  // Attach all the cookies from the virtual cookie store.
  setRequestCookies(mockedRequest)

  return mockedRequest
}
