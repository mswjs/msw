import { OperationDefinitionNode, parse } from 'graphql'
import { ParsedQueryPayload } from '../../graphql'
import { MockedRequest } from '../handlers/requestHandler'

function parseQuery(query: string): ParsedQueryPayload | null {
  try {
    const ast = parse(query)

    const operationDef = ast.definitions.find((def) => {
      return def.kind === 'OperationDefinition'
    }) as OperationDefinitionNode

    return {
      operationType: operationDef?.operation,
      operationName: operationDef?.name?.value,
    }
  } catch (error) {
    return null
  }
}

function getGraphQLQuery(request: MockedRequest<any>): string | null {
  switch (request.method) {
    case 'GET': {
      return request.url.searchParams.get('query')
    }

    case 'POST': {
      if (request.headers.get('content-type') !== 'application/json') {
        return null
      }

      return request.body?.query
    }

    default:
      return null
  }
}

/**
 * Determines if a given request can be considered a GraphQL request.
 * Does not parse the query and does not guarantee its validity.
 */
export function parseGraphQLRequest(
  request: MockedRequest<any>,
): ParsedQueryPayload | null {
  const query = getGraphQLQuery(request)

  if (!query) {
    return null
  }

  return parseQuery(query)
}
