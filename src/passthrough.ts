import { Response } from './fetch'

/**
 * Instruct Mock Service Worker to perform this request as-is.
 * Unlike `bypass()`, this will not trigger an additional request.
 *
 * @example
 * rest.get('/user', () => {
 *   return passthrough()
 * })
 */
export function passthrough(): Response {
  return new Response(null, {
    status: 302,
    statusText: 'Passthrough',
    headers: {
      'x-msw-intention': 'passthrough',
    },
  })
}
