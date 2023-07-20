import { IsomorphicResponse } from '@mswjs/interceptors'

export function createResponseFromIsomorphicResponse(
  response: IsomorphicResponse,
): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
