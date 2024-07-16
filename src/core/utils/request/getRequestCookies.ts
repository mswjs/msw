import cookieUtils from '@bundled-es-modules/cookie'
import { cookieStore } from '../cookieStore'

export function getAllRequestCookies(request: Request): Record<string, string> {
  const requestCookies = request.headers.get('cookie')
  const cookiesFromHeaders = requestCookies
    ? cookieUtils.parse(requestCookies)
    : {}
  const cookiesFromStore = Object.fromEntries(
    cookieStore
      .getCookiesSync(request.url)
      .map((cookie) => [cookie.key, cookie.value]),
  )

  return {
    ...cookiesFromStore,
    ...cookiesFromHeaders,
  }
}
