import cookieUtils from '@bundled-es-modules/cookie'
import { store } from '@mswjs/cookies'

function getAllDocumentCookies() {
  return cookieUtils.parse(document.cookie)
}

/** @todo Rename this to "getDocumentCookies" */
/**
 * Returns relevant document cookies based on the request `credentials` option.
 */
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

/**
 * Returns all accepted mime types, ordered by priority
 * So
 * `"application/graphql-response+json, application/json;q=0.9"`
 * would become
 * ["application/graphql-response+json", "application/json"]
 * and
 * `"application/graphql-response+json, application/json;q=1.1"`
 * would become
 * ["application/json", "application/graphql-response+json"]
 *
 * Currently only takes into account quality weight, not other priority
 * heuristics as described in [RFC7231 Sec 5.3.2](https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.2)
 */
export function getAllAcceptedMimeTypes(
  request: Request,
  fallback: string,
): string[] {
  const accepted: Array<{ type: string; weight: number }> = []
  for (const part of (request.headers.get('accept') || '').split(',')) {
    const [type, ...params] = part.split(';').map((v) => v.trim())
    const entry: (typeof accepted)[number] = { type, weight: 1 }
    for (const param of params) {
      const [key, value] = param.split('=').map((v) => v.trim())
      if (key === 'weight') {
        entry.weight = Number(value)
      }
    }
    accepted.push(entry)
  }
  if (!accepted.length) return [fallback]
  return accepted.sort((a, b) => a.weight - b.weight).map((entry) => entry.type)
}

export function getAllRequestCookies(request: Request): Record<string, string> {
  const requestCookiesString = request.headers.get('cookie')
  const cookiesFromHeaders = requestCookiesString
    ? cookieUtils.parse(requestCookiesString)
    : {}

  store.hydrate()

  const cookiesFromStore = Array.from(store.get(request)?.entries()).reduce<
    Record<string, string>
  >((cookies, [name, { value }]) => {
    return Object.assign(cookies, { [name.trim()]: value })
  }, {})

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
    request.headers.append('cookie', cookieUtils.serialize(name, value))
  }

  return {
    ...forwardedCookies,
    ...cookiesFromHeaders,
  }
}
