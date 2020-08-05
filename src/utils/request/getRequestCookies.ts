import * as cookieUtils from 'cookie'
import { MockedRequest } from '../../handlers/requestHandler'

function getAllCookies() {
  return cookieUtils.parse(document.cookie)
}

/**
 * Returns relevant document cookies based on the request `credentials` option.
 */
export function getRequestCookies(req: MockedRequest) {
  switch (req.credentials) {
    case 'same-origin': {
      // Return document cookies only when requested a resource
      // from the same origin as the current document.
      return location.origin === req.url.origin ? getAllCookies() : {}
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
