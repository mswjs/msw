/**
 * An error indicating network issues while
 * processing a request.
 *
 * @example
 * import { http, NetworkError } from 'msw'
 *
 * http.get('/user', () => {
 *   throw new NetworkError('Failed to fetch')
 * })
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}
