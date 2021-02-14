import { store } from 'virtual-cookies'
import { MockedRequest } from '../../handlers/RequestHandler'
import { getRequestCookies } from './getRequestCookies'

export function setRequestCookies(request: MockedRequest) {
  store.hydrate()
  request.cookies = {
    ...getRequestCookies(request),
    ...Object.fromEntries(
      Array.from(
        store.get({ ...request, url: request.url.toString() })?.entries(),
      ).map(([name, { value }]) => [name, value]),
    ),
  }

  request.headers.set(
    'cookie',
    Object.entries(request.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; '),
  )
}
