import { parseCookie } from 'cookie'
import { cookieStore } from '../cookie-store'

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

/**
 * Returns whether the given request would carry cookies,
 * based on its `credentials` mode.
 */
function includesCredentials(request: Request): boolean {
  switch (request.credentials) {
    case 'same-origin': {
      // Include cookies only when requesting a resource
      // from the same origin as the current document.
      return (
        typeof location !== 'undefined' &&
        location.origin === new URL(request.url).origin
      )
    }

    case 'include': {
      return true
    }

    default: {
      return false
    }
  }
}

function getDocumentCookies(): Record<string, string> {
  if (typeof document === 'undefined') {
    return {}
  }

  return getAllDocumentCookies()
}

export function getAllRequestCookies(request: Request): Record<string, string> {
  const requestCookieHeader = request.headers.get('cookie')
  const cookiesFromHeaders = requestCookieHeader
    ? parseCookies(requestCookieHeader)
    : {}

  if (cookieStore === null || !includesCredentials(request)) {
    return cookiesFromHeaders
  }

  const cookiesFromDocument = getDocumentCookies()

  const cookiesFromStore = cookieStore.getCookies(request.url)
  const storedCookiesObject = Object.fromEntries(
    cookiesFromStore.map((cookie) => [cookie.key, cookie.value]),
  )

  return {
    ...cookiesFromDocument,
    ...storedCookiesObject,
    ...cookiesFromHeaders,
  }
}
