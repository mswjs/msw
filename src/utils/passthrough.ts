import type { HttpResponse } from '#http/http-response'

export const REQUEST_INTENTION_HEADER_NAME = 'x-msw-intention'

export enum RequestIntention {
  passthrough = 'passthrough',
}

/**
 * Performs the intercepted request as-is.
 *
 * This stops request handler lookup so no other handlers
 * can affect this request past this point.
 * Unlike `bypass()`, this will not trigger an additional request.
 *
 * @example
 * http.get('/resource', () => {
 *   return passthrough()
 * })
 *
 * @see {@link https://mswjs.io/docs/api/passthrough `passthrough()` API reference}
 */
export function passthrough(): HttpResponse<any> {
  return new Response(null, {
    status: 302,
    statusText: 'Passthrough',
    headers: {
      [REQUEST_INTENTION_HEADER_NAME]: RequestIntention.passthrough,
    },
  }) as HttpResponse<any>
}

/**
 * Returns `true` if the given response was created by `passthrough()`.
 *
 * @example
 * const response = passthrough()
 * isPassthroughResponse(response) // true
 */
export function isPassthroughResponse(response: Response): boolean {
  return (
    response.status === 302 &&
    response.headers.get(REQUEST_INTENTION_HEADER_NAME) ===
      RequestIntention.passthrough
  )
}
