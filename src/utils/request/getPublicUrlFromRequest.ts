import { format } from 'url'
import { MockedRequest } from '../../handlers/RequestHandler'

/**
 * Returns a relative URL if the given request URL is relative to the current origin.
 * Otherwise returns an absolute URL.
 */
export const getPublicUrlFromRequest = (request: MockedRequest) => {
  return request.referrer.startsWith(request.url.origin)
    ? request.url.pathname
    : format({
        protocol: request.url.protocol,
        host: request.url.host,
        pathname: request.url.pathname,
      })
}
