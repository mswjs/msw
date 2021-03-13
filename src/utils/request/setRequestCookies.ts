import { store } from '@mswjs/cookies'
import { MockedRequest } from '../../handlers/RequestHandler'
import { getRequestCookies } from './getRequestCookies'

export function setRequestCookies(request: MockedRequest) {
  store.hydrate()
  request.cookies = {
    ...getRequestCookies(request),
    ...Array.from(
      store.get({ ...request, url: request.url.toString() })?.entries(),
    ).reduce(
      (cookies, [name, { value }]) => Object.assign(cookies, { [name]: value }),
      {},
    ),
  }

  request.headers.set(
    'cookie',
    Object.entries(request.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; '),
  )
}
