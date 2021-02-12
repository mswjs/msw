import { OperationTypeNode } from 'graphql'
import {
  Mask,
  ResponseWithSerializedHeaders,
} from '../../../setupWorker/glossary'
import { MockedRequest, ResponseResolver } from '../requestHandler'
import { set } from '../../../context/set'
import { status } from '../../../context/status'
import { delay } from '../../../context/delay'
import { fetch } from '../../../context/fetch'
import { data, DataContext } from '../../../context/data'
import { errors } from '../../../context/errors'
import { RequestHandler } from './RequestHandler'
import { getTimestamp } from '../../logging/getTimestamp'
import { getStatusCodeColor } from '../../logging/getStatusCodeColor'
import { prepareRequest } from '../../logging/prepareRequest'
import { prepareResponse } from '../../logging/prepareResponse'
import { matchRequestUrl } from '../../matching/matchRequestUrl'
import {
  ParsedGraphQLRequest,
  GraphQLMultipartRequestBody,
  parseGraphQLRequest,
} from '../../internal/parseGraphQLRequest'
import { getPublicUrlFromRequest } from '../../request/getPublicUrlFromRequest'

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
}

export const graphqlContext: GraphQLContext<any> = {
  set,
  status,
  delay,
  fetch,
  data,
  errors,
}

export type GraphQLVariablesType = Record<string, any>

export interface GraphQLHandlerInfo {
  operationType: ExpectedOperationTypeNode
  operationName: GraphQLHandlerNameSelector
}

export type GraphQLRequestBodyType<
  VariablesType extends GraphQLVariablesType
> =
  | GraphQLJsonRequestBody<VariablesType>
  | GraphQLMultipartRequestBody
  | Record<string, any>
  | undefined

export interface GraphQLJsonRequestBody<
  VariablesType extends GraphQLVariablesType
> {
  query: string
  variables?: VariablesType
}

export interface GraphQLRequestType<VariablesType extends GraphQLVariablesType>
  extends MockedRequest<GraphQLRequestBodyType<VariablesType>> {
  variables: VariablesType
}

export class GraphQLHandler<
  RequestType extends GraphQLRequestType<any> = GraphQLRequestType<any>
> extends RequestHandler<
  GraphQLHandlerInfo,
  RequestType,
  ParsedGraphQLRequest | null,
  GraphQLRequestType<any>
> {
  private endpoint: Mask

  constructor(
    operationType: ExpectedOperationTypeNode,
    operationName: GraphQLHandlerNameSelector,
    endpoint: Mask,
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

  parse(request: RequestType) {
    return parseGraphQLRequest(request)
  }

  protected getPublicRequest(
    request: RequestType,
    parsedResult: ParsedGraphQLRequest,
  ): GraphQLRequestType<any> {
    return {
      ...request,
      variables: parsedResult?.variables || {},
    }
  }

  predicate(request: RequestType, parsedResult: ParsedGraphQLRequest) {
    if (!parsedResult) {
      return false
    }

    if (!parsedResult.operationName) {
      const publicUrl = getPublicUrlFromRequest(request)
      console.warn(`\
[MSW] Failed to intercept a GraphQL request at "${request.method} ${publicUrl}": unnamed GraphQL operations are not supported.

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

  log(request: RequestType, response: ResponseWithSerializedHeaders<any>) {
    const loggedRequest = prepareRequest(request)
    const loggedResponse = prepareResponse(response)

    console.groupCollapsed(
      '[MSW] %s %s (%c%s%c)',
      getTimestamp(),
      this.info.operationName,
      `color:${getStatusCodeColor(response.status)}`,
      response.status,
      'color:inherit',
    )
    console.log('Request:', loggedRequest)
    console.log('Handler:', this)
    console.log('Response:', loggedResponse)
    console.groupEnd()
  }
}
