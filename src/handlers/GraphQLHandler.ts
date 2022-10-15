import type { DocumentNode, OperationTypeNode } from 'graphql'
import { data } from '../context/data'
import { extensions } from '../context/extensions'
import { errors } from '../context/errors'
import { field } from '../context/field'
import { GraphQLPayloadContext } from '../typeUtils'
import { cookie } from '../context/cookie'
import {
  defaultContext,
  DefaultContext,
  RequestHandler,
  RequestHandlerDefaultInfo,
  ResponseResolver,
} from './RequestHandler'
import { getTimestamp } from '../utils/logging/getTimestamp'
import { getStatusCodeColor } from '../utils/logging/getStatusCodeColor'
import { serializeRequest } from '../utils/logging/serializeRequest'
import { serializeResponse } from '../utils/logging/serializeResponse'
import { matchRequestUrl, Path } from '../utils/matching/matchRequestUrl'
import {
  ParsedGraphQLRequest,
  GraphQLMultipartRequestBody,
  parseGraphQLRequest,
  parseDocumentNode,
} from '../utils/internal/parseGraphQLRequest'
import { getPublicUrlFromRequest } from '../utils/request/getPublicUrlFromRequest'
import { devUtils } from '../utils/internal/devUtils'

export type ExpectedOperationTypeNode = OperationTypeNode | 'all'
export type GraphQLHandlerNameSelector = DocumentNode | RegExp | string

// GraphQL related context should contain utility functions
// useful for GraphQL. Functions like `xml()` bear no value
// in the GraphQL universe.
export type GraphQLContext<QueryType extends Record<string, unknown>> =
  DefaultContext & {
    data: GraphQLPayloadContext<QueryType>
    extensions: GraphQLPayloadContext<QueryType>
    errors: typeof errors
    cookie: typeof cookie
    field: typeof field
  }

export const graphqlContext: GraphQLContext<any> = {
  ...defaultContext,
  data,
  extensions,
  errors,
  cookie,
  field,
}

export type GraphQLVariables = Record<string, any>

export interface GraphQLHandlerInfo extends RequestHandlerDefaultInfo {
  operationType: ExpectedOperationTypeNode
  operationName: GraphQLHandlerNameSelector
}

export type GraphQLResolverExtras<Variables extends GraphQLVariables> = {
  query: string
  variables: Variables
}

export type GraphQLRequestBody<VariablesType extends GraphQLVariables> =
  | GraphQLJsonRequestBody<VariablesType>
  | GraphQLMultipartRequestBody
  | Record<string, any>
  | undefined

export interface GraphQLJsonRequestBody<Variables extends GraphQLVariables> {
  query: string
  variables?: Variables
}

export function isDocumentNode(
  value: DocumentNode | any,
): value is DocumentNode {
  if (value == null) {
    return false
  }

  return typeof value === 'object' && 'kind' in value && 'definitions' in value
}

export class GraphQLHandler extends RequestHandler<
  GraphQLHandlerInfo,
  // @ts-ignore @todo
  ParsedGraphQLRequest,
  GraphQLResolverExtras<any>
> {
  private endpoint: Path

  constructor(
    operationType: ExpectedOperationTypeNode,
    operationName: GraphQLHandlerNameSelector,
    endpoint: Path,
    resolver: ResponseResolver<GraphQLContext<any>, GraphQLResolverExtras<any>>,
  ) {
    let resolvedOperationName = operationName

    if (isDocumentNode(operationName)) {
      const parsedNode = parseDocumentNode(operationName)

      if (parsedNode.operationType !== operationType) {
        throw new Error(
          `Failed to create a GraphQL handler: provided a DocumentNode with a mismatched operation type (expected "${operationType}", but got "${parsedNode.operationType}").`,
        )
      }

      if (!parsedNode.operationName) {
        throw new Error(
          `Failed to create a GraphQL handler: provided a DocumentNode with no operation name.`,
        )
      }

      resolvedOperationName = parsedNode.operationName
    }

    const header =
      operationType === 'all'
        ? `${operationType} (origin: ${endpoint.toString()})`
        : `${operationType} ${resolvedOperationName} (origin: ${endpoint.toString()})`

    super({
      info: {
        header,
        operationType,
        operationName: resolvedOperationName,
      },
      ctx: graphqlContext,
      resolver,
    })

    this.endpoint = endpoint
  }

  override async parse(request: Request) {
    return parseGraphQLRequest(request).catch((error) => {
      console.error(error)
      return undefined
    })
  }

  override predicate(request: Request, parsedResult: ParsedGraphQLRequest) {
    if (!parsedResult) {
      return false
    }

    if (!parsedResult.operationName && this.info.operationType !== 'all') {
      const publicUrl = getPublicUrlFromRequest(request)

      devUtils.warn(`\
Failed to intercept a GraphQL request at "${request.method} ${publicUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/operation\
      `)
      return false
    }

    const hasMatchingUrl = matchRequestUrl(new URL(request.url), this.endpoint)
    const hasMatchingOperationType =
      this.info.operationType === 'all' ||
      parsedResult.operationType === this.info.operationType

    const hasMatchingOperationName =
      this.info.operationName instanceof RegExp
        ? this.info.operationName.test(parsedResult.operationName || '')
        : parsedResult.operationName === this.info.operationName

    return (
      hasMatchingUrl.matches &&
      hasMatchingOperationType &&
      hasMatchingOperationName
    )
  }

  protected override extendInfo(
    _request: Request,
    parsedResult: ParsedGraphQLRequest<GraphQLVariables>,
  ) {
    return {
      query: parsedResult?.query || '',
      variables: parsedResult?.variables || {},
    }
  }

  override async log(
    request: Request,
    response: Response,
    parsedRequest: ParsedGraphQLRequest,
  ) {
    const loggedRequest = await serializeRequest(request)
    const loggedResponse = await serializeResponse(response)
    const statusColor = getStatusCodeColor(response.status)
    const requestInfo = parsedRequest?.operationName
      ? `${parsedRequest?.operationType} ${parsedRequest?.operationName}`
      : `anonymous ${parsedRequest?.operationType}`

    console.groupCollapsed(
      devUtils.formatMessage('%s %s (%c%s%c)'),
      getTimestamp(),
      `${requestInfo}`,
      `color:${statusColor}`,
      `${response.status} ${response.statusText}`,
      'color:inherit',
    )
    console.log('Request:', loggedRequest)
    console.log('Handler:', this)
    console.log('Response:', loggedResponse)
    console.groupEnd()
  }
}
