import { store } from '@mswjs/cookies'

export function readResponseCookies(
  request: Request,
  response: Response,
): void {
  store.add({ ...request, url: request.url.toString() }, response)
  store.persist()
}
