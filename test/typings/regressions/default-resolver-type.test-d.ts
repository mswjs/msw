/**
 * @see https://github.com/mswjs/msw/issues/2506
 */
import { http, HttpResponse, HttpResponseResolver } from 'msw'

it('supports a union of the matching explicit and implicit response resolvers', () => {
  function handle(resolver?: HttpResponseResolver<never, never, string>) {
    const defaultResolver = () => HttpResponse.html('<div>test</div>')
    http.get('/path', resolver || defaultResolver)
  }
})
