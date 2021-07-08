import { MockedRequest } from '../../handlers/RequestHandler'

/**
 * Returns a relative URL if the given request URL is relative to the current origin.
 * Otherwise returns an absolute URL.
 */
export const getPublicUrlFromRequest = (request: MockedRequest) => {
  return request.referrer.startsWith(request.url.origin)
    ? request.url.pathname
    : new URL(
        request.url.pathname,
        `${request.url.protocol}//${request.url.host}`,
      ).href
}
