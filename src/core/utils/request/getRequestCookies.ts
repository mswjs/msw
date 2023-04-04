import * as cookieUtils from 'cookie'
import { store } from '@mswjs/cookies'

function getAllDocumentCookies() {
  return cookieUtils.parse(document.cookie)
}

/**
 * Returns relevant document cookies based on the request `credentials` option.
 */
/** @todo Rename this to "getDocumentCookies" */
export function getRequestCookies(request: Request): Record<string, string> {
  /**
   * @note No cookies persist on the document in Node.js: no document.
   */
  if (typeof document === 'undefined' || typeof location === 'undefined') {
    return {}
  }

  switch (request.credentials) {
    case 'same-origin': {
      const url = new URL(request.url)

      // Return document cookies only when requested a resource
      // from the same origin as the current document.
      return location.origin === url.origin ? getAllDocumentCookies() : {}
    }

    case 'include': {
      // Return all document cookies.
      return getAllDocumentCookies()
    }

    default: {
      return {}
    }
  }
}

export function getAllRequestCookies(request: Request): Record<string, string> {
  const requestCookiesString = request.headers.get('cookie')
  const cookiesFromHeaders = requestCookiesString
    ? cookieUtils.parse(requestCookiesString)
    : {}

  store.hydrate()

  const cookiesFromStore = Array.from(store.get(request)?.entries()).reduce(
    (cookies, [name, { value }]) => {
      return Object.assign(cookies, { [name.trim()]: value })
    },
    {},
  )

  const cookiesFromDocument = getRequestCookies(request)

  const forwardedCookies = {
    ...cookiesFromDocument,
    ...cookiesFromStore,
  }

  // Set the inferred cookies from the cookie store and the document
  // on the request's headers.
  /**
   * @todo Consider making this a separate step so this function
   * is pure-er.
   */
  for (const [name, value] of Object.entries(forwardedCookies)) {
    request.headers.append('cookie', `${name}=${value}`)
  }

  return {
    ...forwardedCookies,
    ...cookiesFromHeaders,
  }
}
