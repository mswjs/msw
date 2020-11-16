import * as cookieUtils from 'cookie'
import { cookieStore } from '../../cookie-store'
import { MockedRequest } from '../handlers/requestHandler'

function getVirtualCookies(origin: string) {
  // @todo Respect the path of the cookies.
  // @todo Make sure secure cookies are only appended for https domains.
  // @todo Respect the SameSite attribute.
  const cookies = cookieStore.get(origin)
  const cookieEntries =
    cookies === undefined ? [] : Array.from(cookies.entries())
  const now = new Date()

  return Object.fromEntries(
    cookieEntries
      .filter(([name, { expires }]) => {
        if (expires !== undefined && expires < now) {
          cookies?.delete(name)

          return false
        }

        return true
      })
      .map(([name, { value }]) => [name, value]),
  )
}

/**
 * Returns relevant document cookies based on the request `credentials` option.
 */
export function getRequestCookies(req: MockedRequest) {
  switch (req.credentials) {
    case 'same-origin': {
      // Return document cookies only when requested a resource
      // from the same origin as the current document.
      return location.origin === req.url.origin
        ? {
            ...cookieUtils.parse(document.cookie),
            ...getVirtualCookies(req.url.origin),
          }
        : {}
    }

    case 'include': {
      // Return all document cookies.
      return getVirtualCookies(req.url.origin)
    }

    default: {
      return {}
    }
  }
}
