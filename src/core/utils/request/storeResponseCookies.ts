import { cookieStore } from '../cookieStore'
import { getRawSetCookie } from '../response-decorators'

export async function storeResponseCookies(
  request: Request,
  response: Response,
): Promise<void> {
  if (cookieStore === null) {
    return
  }

  for (const responseCookie of getRawSetCookie(response)) {
    await cookieStore.setCookie(responseCookie, request.url)
  }
}
