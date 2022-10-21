import { Request } from './Request'

/**
 * Creates a "Request" instance that, when fetched, will
 * ignore any otherwise matching request handlers and will
 * by performed against the actual network.
 *
 * @example
 * bypass('/user')
 * bypass(new URL('/resource', 'https://example.com'))
 * bypass(new Request('/user'))
 */
export function bypass<RequestType extends Request>(
  input: string | URL | Request,
): RequestType {
  const request = toRequest<RequestType>(input)

  // Set the internal header that would instruct MSW
  // to bypass this request from any further request matching.
  // Unlike "passthrough()", bypass is meant for performing
  // additional requests within pending request resolution.
  request.headers.set('x-msw-intention', 'bypass')

  return request
}

function toRequest<RequestType extends Request>(
  input: string | URL | Request,
): RequestType {
  if (input instanceof Request) {
    /**
     * @note When using "node-fetch", if the request instance
     * hasn't been constructed using ONLY the "node-fetch"'s Request,
     * the input to its "fetch()" will be invalid. "node-fetch" will
     * think it's given a URL object, and will throw on it being invalid.
     */
    return input.clone() as RequestType
  }

  const baseUrl = typeof location !== 'undefined' ? location.href : undefined
  const requestUrl = new URL(input, baseUrl)

  return new Request(requestUrl) as RequestType
}
