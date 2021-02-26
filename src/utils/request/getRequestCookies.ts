import * as cookieUtils from 'cookie'
import { MockedRequest } from '../../handlers/RequestHandler'

function getAllCookies() {
  return cookieUtils.parse(document.cookie)
}

/**
 * Returns relevant document cookies based on the request `credentials` option.
 */
export function getRequestCookies(request: MockedRequest) {
  /**
   * @note No cookies persist on the document in Node.js: no document.
   */
  if (typeof location === 'undefined') {
    return {}
  }

  switch (request.credentials) {
    case 'same-origin': {
      // Return document cookies only when requested a resource
      // from the same origin as the current document.
      return location.origin === request.url.origin ? getAllCookies() : {}
    }

    case 'include': {
      // Return all document cookies.
      return getAllCookies()
    }

    default: {
      return {}
    }
  }
}
