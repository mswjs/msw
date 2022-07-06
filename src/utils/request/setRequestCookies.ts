import * as cookieUtils from 'cookie'
import { store } from '@mswjs/cookies'
import { MockedRequest } from '../../handlers/RequestHandler'
import { getRequestCookies } from './getRequestCookies'

/**
 * Sets relevant cookies on the request.
 * Request cookies are taken from the following sources:
 * - Immediate (own) request cookies (those in the "Cookie" request header);
 * - From the `document.cookie` based on the request's `credentials` value;
 * - From the internal cookie store that persists/hydrates cookies in Node.js
 */
export function setRequestCookies(request: MockedRequest): void {
  // Set mocked request cookies from the `cookie` header of the original request.
  // No need to take `credentials` into account, because in Node.js requests are intercepted
  // _after_ they happen. Request issuer should have already taken care of sending relevant cookies.
  // Unlike browser, where interception is on the worker level, _before_ the request happens.
  const requestCookiesString = request.headers.get('cookie')

  store.hydrate()

  const cookiesFromStore = Array.from(
    store.get({ ...request, url: request.url.toString() })?.entries(),
  ).reduce((cookies, [name, { value }]) => {
    return Object.assign(cookies, { [name.trim()]: value })
  }, {})

  const cookiesFromDocument = getRequestCookies(request)

  const forwardedCookies = {
    ...cookiesFromDocument,
    ...cookiesFromStore,
  }

  // Ensure the persisted (document) cookies are propagated to the request.
  // Propagated the cookies persisted in the Cookie Store to the request headers.
  // This forwards relevant request cookies based on the request's credentials.
  for (const [name, value] of Object.entries(forwardedCookies)) {
    request.headers.append('cookie', `${name}=${value}`)
  }

  const ownCookies = requestCookiesString
    ? cookieUtils.parse(requestCookiesString)
    : {}

  request.cookies = {
    ...request.cookies,
    ...forwardedCookies,
    ...ownCookies,
  }
}
