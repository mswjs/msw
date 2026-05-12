import { cookieStore } from '../cookieStore'
import { getRawSetCookie } from '../HttpResponse/decorators'

export async function storeResponseCookies(
  request: Request,
  response: Response,
): Promise<void> {
  for (const responseCookie of getRawSetCookie(response)) {
    await cookieStore.setCookie(responseCookie, request.url)
  }
}
