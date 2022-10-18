/**
 * An error indicating network issues while
 * processing a request.
 *
 * @example
 * import { rest, NetworkError } from 'msw'
 *
 * rest.get('/user', () => {
 *   throw new NetworkError('Failed to fetch')
 * })
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}
