import { OperationTypeNode } from 'graphql'
import { Path } from 'node-match-path'
import { SerializedResponse } from '../setupWorker/glossary'
import { set } from '../context/set'
import { status } from '../context/status'
import { delay } from '../context/delay'
import { fetch } from '../context/fetch'
import { data, DataContext } from '../context/data'
import { errors } from '../context/errors'
import { cookie } from '../context/cookie'
import {
  MockedRequest,
  RequestHandler,
  ResponseResolver,
} from './RequestHandler'
import { getTimestamp } from '../utils/logging/getTimestamp'
import { getStatusCodeColor } from '../utils/logging/getStatusCodeColor'
import { prepareRequest } from '../utils/logging/prepareRequest'
import { prepareResponse } from '../utils/logging/prepareResponse'
import { matchRequestUrl } from '../utils/matching/matchRequestUrl'
import {
  ParsedGraphQLRequest,
  GraphQLMultipartRequestBody,
  parseGraphQLRequest,
} from '../utils/internal/parseGraphQLRequest'
import { getPublicUrlFromRequest } from '../utils/request/getPublicUrlFromRequest'
import { tryCatch } from '../utils/internal/tryCatch'
import { devUtils } from '../utils/internal/devUtils'

export type ExpectedOperationTypeNode = OperationTypeNode | 'all'
export type GraphQLHandlerNameSelector = RegExp | string

// GraphQL related context should contain utility functions
// useful for GraphQL. Functions like `xml()` bear no value
// in the GraphQL universe.
export type GraphQLContext<QueryType> = {
  set: typeof set
  status: typeof status
  delay: typeof delay
  fetch: typeof fetch
  data: DataContext<QueryType>
  errors: typeof errors
  cookie: typeof cookie
}

export const graphqlContext: GraphQLContext<any> = {
  set,
  status,
  delay,
  fetch,
  data,
  errors,
  cookie,
}

export type GraphQLVariables = Record<string, any>

export interface GraphQLHandlerInfo {
  operationType: ExpectedOperationTypeNode
  operationName: GraphQLHandlerNameSelector
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

export interface GraphQLRequest<Variables extends GraphQLVariables>
  extends MockedRequest<GraphQLRequestBody<Variables>> {
  variables: Variables
}

export class GraphQLHandler<
  Request extends GraphQLRequest<any> = GraphQLRequest<any>,
> extends RequestHandler<
  GraphQLHandlerInfo,
  Request,
  ParsedGraphQLRequest | null,
  GraphQLRequest<any>
> {
  private endpoint: Path

  constructor(
    operationType: ExpectedOperationTypeNode,
    operationName: GraphQLHandlerNameSelector,
    endpoint: Path,
    resolver: ResponseResolver<any, any>,
  ) {
    const header =
      operationType === 'all'
        ? `${operationType} (origin: ${endpoint.toString()})`
        : `${operationType} ${operationName} (origin: ${endpoint.toString()})`

    super({
      info: {
        header,
        operationType,
        operationName,
      },
      ctx: graphqlContext,
      resolver,
    })

    this.endpoint = endpoint
  }

  parse(request: MockedRequest) {
    return tryCatch(
      () => parseGraphQLRequest(request),
      (error) => console.error(error.message),
    )
  }

  protected getPublicRequest(
    request: Request,
    parsedResult: ParsedGraphQLRequest,
  ): GraphQLRequest<any> {
    return {
      ...request,
      variables: parsedResult?.variables || {},
    }
  }

  predicate(request: MockedRequest, parsedResult: ParsedGraphQLRequest) {
    if (!parsedResult) {
      return false
    }

    if (!parsedResult.operationName) {
      const publicUrl = getPublicUrlFromRequest(request)
      devUtils.warn(`\
Failed to intercept a GraphQL request at "${request.method} ${publicUrl}": unnamed GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/operation\
      `)
      return false
    }

    const hasMatchingUrl = matchRequestUrl(request.url, this.endpoint)
    const hasMatchingOperationType =
      this.info.operationType === 'all' ||
      parsedResult.operationType === this.info.operationType
    const hasMatchingOperationName =
      this.info.operationName instanceof RegExp
        ? this.info.operationName.test(parsedResult.operationName)
        : parsedResult.operationName === this.info.operationName

    return (
      hasMatchingUrl.matches &&
      hasMatchingOperationType &&
      hasMatchingOperationName
    )
  }

  log(
    request: Request,
    response: SerializedResponse<any>,
    handler: this,
    parsedRequest: ParsedGraphQLRequest,
  ) {
    const loggedRequest = prepareRequest(request)
    const loggedResponse = prepareResponse(response)

    console.groupCollapsed(
      devUtils.formatMessage('%s %s (%c%s%c)'),
      getTimestamp(),
      `${parsedRequest?.operationType} ${parsedRequest?.operationName}`,
      `color:${getStatusCodeColor(response.status)} %s`,
      response.status,
      response.statusText,
      'color:inherit',
    )
    console.log('Request:', loggedRequest)
    console.log('Handler:', this)
    console.log('Response:', loggedResponse)
    console.groupEnd()
  }
}
