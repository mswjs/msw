import {
  parse as parseCookie,
  serialize as serializeCookie,
} from '../../../shims/cookie'
import { cookieStore } from '../cookieStore'

function parseCookies(input: string): Record<string, string> {
  const parsedCookies = parseCookie(input)
  const cookies: Record<string, string> = {}

  for (const cookieName in parsedCookies) {
    if (typeof parsedCookies[cookieName] !== 'undefined') {
      cookies[cookieName] = parsedCookies[cookieName]
    }
  }

  return cookies
}

function getAllDocumentCookies() {
  return parseCookies(document.cookie)
}

function getDocumentCookies(request: Request): Record<string, string> {
  if (typeof document === 'undefined' || typeof location === 'undefined') {
    return {}
  }

  switch (request.credentials) {
    case 'same-origin': {
      const requestUrl = new URL(request.url)

      // Return document cookies only when requested a resource
      // from the same origin as the current document.
      return location.origin === requestUrl.origin
        ? getAllDocumentCookies()
        : {}
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
  /**
   * @note While the "cookie" header is a forbidden header field
   * in the browser, you can read it in Node.js. We need to respect
   * it for mocking in Node.js.
   */
  const requestCookieHeader = request.headers.get('cookie')
  const cookiesFromHeaders = requestCookieHeader
    ? parseCookies(requestCookieHeader)
    : {}

  const cookiesFromDocument = getDocumentCookies(request)

  // Forward the document cookies to the request headers.
  for (const name in cookiesFromDocument) {
    request.headers.append(
      'cookie',
      serializeCookie(name, cookiesFromDocument[name]),
    )
  }

  const cookiesFromStore = cookieStore.getCookies(request.url)
  const storedCookiesObject = Object.fromEntries(
    cookiesFromStore.map((cookie) => [cookie.key, cookie.value]),
  )

  // Forward the raw stored cookies to request headers
  // so they contain metadata like "expires", "secure", etc.
  for (const cookie of cookiesFromStore) {
    request.headers.append('cookie', cookie.toString())
  }

  return {
    ...cookiesFromDocument,
    ...storedCookiesObject,
    ...cookiesFromHeaders,
  }
}
