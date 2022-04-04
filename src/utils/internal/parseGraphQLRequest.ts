import {
  DocumentNode,
  OperationDefinitionNode,
  OperationTypeNode,
  parse,
} from 'graphql'
import { GraphQLVariables } from '../../handlers/GraphQLHandler'
import { MockedRequest } from '../../handlers/RequestHandler'
import { getPublicUrlFromRequest } from '../request/getPublicUrlFromRequest'
import { devUtils } from './devUtils'
import { jsonParse } from './jsonParse'

interface GraphQLInput {
  query: string | undefined
  variables?: GraphQLVariables
}

export interface ParsedGraphQLQuery {
  operationType: OperationTypeNode
  operationName?: string
}

export type ParsedGraphQLRequest<
  VariablesType extends GraphQLVariables = GraphQLVariables,
> =
  | (ParsedGraphQLQuery & {
      variables?: VariablesType
    })
  | undefined

export function parseDocumentNode(node: DocumentNode): ParsedGraphQLQuery {
  const operationDef = node.definitions.find((def) => {
    return def.kind === 'OperationDefinition'
  }) as OperationDefinitionNode

  return {
    operationType: operationDef?.operation,
    operationName: operationDef?.name?.value,
  }
}

function parseQuery(query: string): ParsedGraphQLQuery | Error {
  try {
    const ast = parse(query)
    return parseDocumentNode(ast)
  } catch (error) {
    return error
  }
}

export type GraphQLParsedOperationsMap = Record<string, string[]>
export type GraphQLMultipartRequestBody = {
  operations: string
  map?: string
} & {
  [fileName: string]: File
}

function extractMultipartVariables<VariablesType extends GraphQLVariables>(
  variables: VariablesType,
  map: GraphQLParsedOperationsMap,
  files: Record<string, File>,
) {
  const operations = { variables }
  for (const [key, pathArray] of Object.entries(map)) {
    if (!(key in files)) {
      throw new Error(`Given files do not have a key '${key}' .`)
    }

    for (const dotPath of pathArray) {
      const [lastPath, ...reversedPaths] = dotPath.split('.').reverse()
      const paths = reversedPaths.reverse()
      let target: Record<string, any> = operations

      for (const path of paths) {
        if (!(path in target)) {
          throw new Error(`Property '${paths}' is not in operations.`)
        }

        target = target[path]
      }

      target[lastPath] = files[key]
    }
  }
  return operations.variables
}

/**
 * Check if the given GraphQL query string is potentially valid
 * without parsing it. This returns false fast when analyzing
 * GET/POST requests with the "query" parameter/body property
 * which are not a GraphQL request.
 */
function maybeGraphQLQuery(query?: string | null): query is string {
  const normalizedQuery = query?.toLowerCase().trim() || ''

  return (
    normalizedQuery.startsWith('query') ||
    normalizedQuery.startsWith('mutation') ||
    false
  )
}

function getGraphQLInput(request: MockedRequest<any>): GraphQLInput | null {
  switch (request.method) {
    case 'GET': {
      const query = request.url.searchParams.get('query')
      const variables = request.url.searchParams.get('variables') || ''

      return {
        query: maybeGraphQLQuery(query) ? query : undefined,
        variables: jsonParse(variables),
      }
    }

    case 'POST': {
      if (request.body?.query) {
        const { query, variables } = request.body as {
          query?: string
          variables: Record<string, unknown>
        }

        return {
          query: maybeGraphQLQuery(query) ? query : undefined,
          variables,
        }
      }

      // Handle multipart body operations.
      if (request.body?.operations) {
        const { operations, map, ...files } =
          request.body as GraphQLMultipartRequestBody
        const parsedOperations =
          jsonParse<{ query?: string; variables?: GraphQLVariables }>(
            operations,
          ) || {}

        if (!parsedOperations.query) {
          return null
        }

        const parsedMap = jsonParse<GraphQLParsedOperationsMap>(map || '') || {}
        const variables = parsedOperations.variables
          ? extractMultipartVariables(
              parsedOperations.variables,
              parsedMap,
              files,
            )
          : {}

        return {
          query: parsedOperations.query,
          variables,
        }
      }
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
): ParsedGraphQLRequest {
  const input = getGraphQLInput(request)

  if (!input || !input.query) {
    return undefined
  }

  const { query, variables } = input
  const parsedResult = parseQuery(query)

  if (parsedResult instanceof Error) {
    const requestPublicUrl = getPublicUrlFromRequest(request)

    throw new Error(
      devUtils.formatMessage(
        'Failed to intercept a GraphQL request to "%s %s": cannot parse query. See the error message from the parser below.\n\n%s',
        request.method,
        requestPublicUrl,
        parsedResult.message,
      ),
    )
  }

  return {
    operationType: parsedResult.operationType,
    operationName: parsedResult.operationName,
    variables,
  }
}
