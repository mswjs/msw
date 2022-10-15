import type { Request as RemixRequest } from '@remix-run/web-fetch'
import { Request } from './fetch'

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

  // Set the custom MSW bypass header.
  // The worker recognizes this header, strips it away,
  // and performs the intercepted request as-is.
  request.headers.set('x-msw-bypass', 'true')

  return request
}

function toRequest(input: string | URL | Request): RemixRequest {
  if (input instanceof Request) {
    return input.clone() as RemixRequest
  }

  return new Request(input) as RemixRequest
}
