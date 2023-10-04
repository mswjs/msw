import { invariant } from 'outvariant'

export type BypassRequestInput = string | URL | Request

/**
 * Creates a `Request` instance that will always be ignored by MSW.
 *
 * @example
 * import { bypass } from 'msw'
 *
 * fetch(bypass('/resource'))
 * fetch(bypass(new URL('/resource', 'https://example.com)))
 * fetch(bypass(new Request('https://example.com/resource')))
 *
 * @see {@link https://mswjs.io/docs/api/bypass `bypass()` API reference}
 */
export function bypass(input: BypassRequestInput, init?: RequestInit): Request {
  const request = input instanceof Request ? input : new Request(input, init)

  invariant(
    !request.bodyUsed,
    'Failed to create a bypassed request to "%s %s": given request instance already has its body read. Make sure to clone the intercepted request if you wish to read its body before bypassing it.',
    request.method,
    request.url,
  )

  const requestClone = request.clone()

  // Set the internal header that would instruct MSW
  // to bypass this request from any further request matching.
  // Unlike "passthrough()", bypass is meant for performing
  // additional requests within pending request resolution.
  requestClone.headers.set('x-msw-intention', 'bypass')

  return requestClone
}
