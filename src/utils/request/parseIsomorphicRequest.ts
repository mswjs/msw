import * as cookieUtils from 'cookie'
import { IsomorphicRequest } from '@mswjs/interceptors'
import { MockedRequest } from '../../handlers/RequestHandler'
import { uuidv4 } from '../internal/uuidv4'
import { parseBody } from './parseBody'
import { setRequestCookies } from './setRequestCookies'

/**
 * Converts a given isomorphic request to a `MockedRequest` instance.
 */
export function parseIsomorphicRequest(
  request: IsomorphicRequest,
): MockedRequest {
  const requestId = uuidv4()

  request.headers.set('x-msw-request-id', requestId)

  const mockedRequest: MockedRequest = {
    id: requestId,
    url: request.url,
    method: request.method,
    body: parseBody(request.body, request.headers),
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
    credentials: 'same-origin',
  }

  // Set mocked request cookies from the `cookie` header of the original request.
  // No need to take `credentials` into account, because in Node.js requests are intercepted
  // _after_ they happen. Request issuer should have already taken care of sending relevant cookies.
  // Unlike browser, where interception is on the worker level, _before_ the request happens.
  const requestCookiesString = request.headers.get('cookie')

  // Attach all the cookies from the virtual cookie store.
  setRequestCookies(mockedRequest)

  const requestCookies = requestCookiesString
    ? cookieUtils.parse(requestCookiesString)
    : {}

  // Merge both direct request cookies and the cookies inherited
  // from other same-origin requests in the cookie store.
  mockedRequest.cookies = {
    ...mockedRequest.cookies,
    ...requestCookies,
  }

  return mockedRequest
}
