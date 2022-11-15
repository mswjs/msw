import { invariant } from 'outvariant'
import { Headers } from 'headers-polyfill'

export type BypassRequestInput = string | URL | Request

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
export async function bypass(
  input: BypassRequestInput,
  init?: RequestInit,
): Promise<[string, RequestInit]> {
  if (isRequest(input)) {
    invariant(
      !input.bodyUsed,
      'Failed to create a bypassed request to "%s %s": given request instance already has its body read. Make sure to clone the intercepted request if you wish to read its body before bypassing it.',
      input.method,
      input.url,
    )
  }

  const url = isRequest(input) ? input.url : input.toString()
  const resolvedInit: RequestInit =
    typeof init !== 'undefined' ? init : await getRequestInit(input)

  // Set the internal header that would instruct MSW
  // to bypass this request from any further request matching.
  // Unlike "passthrough()", bypass is meant for performing
  // additional requests within pending request resolution.
  const headers = new Headers(resolvedInit.headers)
  headers.set('x-msw-intention', 'bypass')
  resolvedInit.headers = headers

  return [url, resolvedInit]
}

function isRequest(input: BypassRequestInput): input is Request {
  return (
    typeof input === 'object' &&
    input.constructor.name === 'Request' &&
    'clone' in input &&
    typeof input.clone === 'function'
  )
}

async function getRequestInit(input: BypassRequestInput): Promise<RequestInit> {
  if (!isRequest(input)) {
    return {}
  }

  const init: RequestInit = {
    // Set each request init property explicitly
    // to prevent leaking internal properties of whichever
    // Request polyfill provided as the input.
    mode: input.mode,
    method: input.method,
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

  // Include "RequestInit.body" only for appropriate requests.
  if (init.method !== 'HEAD' && input.method !== 'GET') {
    init.body = await input.clone().arrayBuffer()

    /**
     * `RequestInit.duplex` is not present in TypeScript but is
     * required if you wish to send `ReadableStream` as a request body.
     * @see https://developer.chrome.com/articles/fetch-streaming-requests
     * @see https://github.com/whatwg/fetch/pull/1457
     */
    // @ts-ignore
    init.duplex = input.duplex
  }

  return init
}
