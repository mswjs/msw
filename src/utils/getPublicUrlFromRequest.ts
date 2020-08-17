import { format } from 'url'
import { MockedRequest } from '../handlers/requestHandler'

/**
 * Returns an absolute or relative URL string based on the URL's origin.
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
