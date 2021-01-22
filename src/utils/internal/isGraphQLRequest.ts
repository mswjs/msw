import { MockedRequest } from '../handlers/requestHandler'

/**
 * Determines if a given request can be considered a GraphQL request.
 * Does not parse the query and does not guarantee its validity.
 */
export function isGraphQLRequest(request: MockedRequest<any>): boolean {
  switch (request.method) {
    case 'GET':
      return !!request.url.searchParams.get('query')

    case 'POST':
      const hasJsonContentType =
        request.headers.get('content-type') === 'application/json'
      const hasCompatibleJsonBody = !!request.body?.query
      return hasJsonContentType && hasCompatibleJsonBody

    default:
      return false
  }
}
