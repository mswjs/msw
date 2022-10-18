import type { Request as RemixRequest } from '@remix-run/web-fetch'
import { Request } from './Request'

/**
 * Creates a "Request" instance that, when fetched, will
 * ignore any otherwise matching request handlers and will
 * by performed against the actual network.
 *
 * @example
 * bypass('/user')
 * bypass(new URL('/resource', 'api.example.com'))
 * bypass(new Request('/user'))
 */
export function bypass(input: string | URL | Request): RemixRequest {
  const request = toRequest(input)

  // Set the internal header that would instruct MSW
  // to bypass this request from any further request matching.
  // Unlike "passthrough()", bypass is meant for performing
  // additional requests within pending request resolution.
  request.headers.set('x-msw-intention', 'bypass')

  return request
}

function toRequest(input: string | URL | Request): RemixRequest {
  if (input instanceof Request) {
    /**
     * @note When using "node-fetch", if the request instance
     * hasn't been constructed using ONLY the "node-fetch"'s Request,
     * the input to its "fetch()" will be invalid. "node-fetch" will
     * think it's given a URL object, and will throw on it being invalid.
     */
    return input.clone() as RemixRequest
  }

  const baseUrl = typeof location !== 'undefined' ? location.href : undefined
  const requestUrl = new URL(input, baseUrl)

  return new Request(requestUrl) as RemixRequest
}
