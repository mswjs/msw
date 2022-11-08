import { Headers } from 'headers-polyfill'

/**
 * Derives request input and init from the given Request info
 * to define a request that will always be ignored by MSW.
 *
 * @example
 * import fetch, { Request } from 'node-fetch'
 * import { bypass } from 'msw'
 *
 * fetch(...bypass('/resource'))
 * fetch(...bypass(new URL('/resource', 'https://example.com)))
 * fetch(...bypass(new Request('https://example.com/resource')))
 */
export function bypass(
  input: string | URL | Request,
  init?: RequestInit,
): [string, RequestInit] {
  const isGivenRequest = isRequest(input)
  const url = isGivenRequest ? input.url : input.toString()
  const resolvedInit: RequestInit =
    typeof init !== 'undefined'
      ? init
      : isGivenRequest
      ? {
          // Set each request init property explicitly
          // to prevent leaking internal properties of whichever
          // Request polyfill provided as the input.
          mode: input.mode,
          method: input.method,
          body: input.body,
          cache: input.cache,
          headers: input.headers,
          credentials: input.credentials,
          signal: input.signal,
          referrerPolicy: input.referrerPolicy,
          referrer: input.referrer,
          redirect: input.redirect,
          integrity: input.integrity,
          keepalive: input.keepalive,
        }
      : {}

  // Set the internal header that would instruct MSW
  // to bypass this request from any further request matching.
  // Unlike "passthrough()", bypass is meant for performing
  // additional requests within pending request resolution.
  const headers = new Headers(resolvedInit.headers)
  headers.set('x-msw-intention', 'bypass')
  resolvedInit.headers = headers

  return [url, resolvedInit]
}

function isRequest(input: string | URL | Request): input is Request {
  return (
    typeof input === 'object' &&
    input.constructor.name === 'Request' &&
    'clone' in input &&
    typeof input.clone === 'function'
  )
}
