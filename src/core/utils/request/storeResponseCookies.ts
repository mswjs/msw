import { cookieStore } from '../cookieStore'
import { kSetCookie } from '../HttpResponse/decorators'

export function storeResponseCookies(
  request: Request,
  response: Response,
): void {
  // Grab the raw "Set-Cookie" response header provided
  // in the HeadersInit for this mocked response.
  const responseCookies = Reflect.get(response, kSetCookie) as
    | string
    | undefined

  if (responseCookies) {
    cookieStore.setCookie(responseCookies, request.url)
  }
}
