import { cookieStore } from '../cookieStore'
import { getRawSetCookie } from '../HttpResponse/decorators'

export async function storeResponseCookies(
  request: Request,
  response: Response,
): Promise<void> {
  await Promise.all(
    // Grab the raw "Set-Cookie" response header provided
    // in the HeadersInit for this mocked response.
    getRawSetCookie(response).map(async (responseCookie) => {
      await cookieStore.setCookie(responseCookie, request.url)
    }),
  )
}
