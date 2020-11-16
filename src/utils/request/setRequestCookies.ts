import { store } from 'virtual-cookies'
import { MockedRequest } from '../../handlers/RequestHandler'
import { getRequestCookies } from './getRequestCookies'

export function setRequestCookies(req: MockedRequest) {
  store.hydrate()
  req.cookies = {
    ...getRequestCookies(req),
    ...Object.fromEntries(
      Array.from(
        store.get({ ...req, url: req.url.toString() })?.entries(),
      ).map(([name, { value }]) => [name, value]),
    ),
  }
  req.headers.set(
    'cookie',
    Object.entries(req.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; '),
  )
}
