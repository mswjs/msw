import getStringMatchScore from 'js-levenshtein'
import { parseGraphQLRequest } from '../internal/parseGraphQLRequest'
import {
  DefaultRequestBodyType,
  MockedRequest,
  RequestHandler,
  RequestParams,
} from '../handlers/requestHandler'
import { RequestHandlersList } from '../../setupWorker/glossary'
import { ParsedRestRequest, restContext } from '../../rest'
import {
  GraphQLMockedRequest,
  GraphQLMockedContext,
  GraphQLRequestParsedResult,
  ParsedQueryPayload,
} from '../../graphql'
import { getPublicUrlFromRequest } from './getPublicUrlFromRequest'

type UnhandledRequestCallback = (req: MockedRequest) => void

export type UnhandledRequestStrategy =
  | 'bypass'
  | 'warn'
  | 'error'
  | UnhandledRequestCallback

type RestRequestHandler = RequestHandler<
  MockedRequest<DefaultRequestBodyType, RequestParams>,
  typeof restContext,
  ParsedRestRequest
>

type GraphQLRequestHandler = RequestHandler<
  GraphQLMockedRequest<any>,
  GraphQLMockedContext,
  GraphQLRequestParsedResult<any>
>

function groupHandlersByType(handlers: RequestHandlersList) {
  return handlers.reduce<{
    rest: RestRequestHandler[]
    graphql: GraphQLRequestHandler[]
  }>(
    (groups, handler) => {
      const metaInfo = handler.getMetaInfo()
      groups[metaInfo.type].push(handler)
      return groups
    },
    {
      rest: [],
      graphql: [],
    },
  )
}

type RequestHandlerSuggestionList = [number, RequestHandler][]
type ScoreGetterFn = (request: MockedRequest, handler: RequestHandler) => number

function getScoreForRestHandler(): ScoreGetterFn {
  return (request, handler) => {
    const metaInfo = handler.getMetaInfo()

    if (metaInfo.mask instanceof RegExp) {
      return Infinity
    }

    const requestPublicUrl = getPublicUrlFromRequest(request)
    return getStringMatchScore(requestPublicUrl, metaInfo.mask)
  }
}

function getScoreForGraphQLHandler(
  parsedQuery: ParsedQueryPayload,
): ScoreGetterFn {
  return (_, handler) => {
    if (typeof parsedQuery.operationName === 'undefined') {
      return Infinity
    }

    const metaInfo = handler.getMetaInfo()
    const handlerOperationName = metaInfo.operationName

    return getStringMatchScore(parsedQuery.operationName, handlerOperationName)
  }
}

function getSuggestedHandler(
  request: MockedRequest,
  handlers: RequestHandlersList,
  getScore: ScoreGetterFn,
): RequestHandler | undefined {
  const suggestedHandler = handlers
    .reduce<RequestHandlerSuggestionList>((acc, handler) => {
      const score = getScore(request, handler)
      return acc.concat([[score, handler]])
    }, [])
    .sort(([leftScore], [rightScore]) => {
      return leftScore - rightScore
    })
    .find(([score]) => {
      return score <= 2
    })

  return suggestedHandler?.[1]
}

export function onUnhandledRequest(
  request: MockedRequest,
  handlers: RequestHandlersList,
  strategy: UnhandledRequestStrategy = 'bypass',
): void {
  if (typeof strategy === 'function') {
    strategy(request)
    return
  }

  const parsedGraphQLQuery = parseGraphQLRequest(request)
  const handlerGroups = groupHandlersByType(handlers)
  const relevantHandlers = parsedGraphQLQuery
    ? handlerGroups.graphql
    : handlerGroups.rest

  let handlerSuggestion = ''
  const suggestedHandler = getSuggestedHandler(
    request,
    relevantHandlers,
    parsedGraphQLQuery
      ? getScoreForGraphQLHandler(parsedGraphQLQuery)
      : getScoreForRestHandler(),
  )

  if (suggestedHandler) {
    const metaInfo = suggestedHandler.getMetaInfo()
    handlerSuggestion = `Did you mean to request "${metaInfo.header}" instead?`
  }

  const publicUrl = getPublicUrlFromRequest(request)
  const requestHeader = parsedGraphQLQuery
    ? `${parsedGraphQLQuery.operationType} ${parsedGraphQLQuery.operationName} (${request.method} ${publicUrl})`
    : `${request.method} ${publicUrl}`

  const messageTemplate = [
    `captured a request without a matching request handler:`,
    `  • ${requestHeader}`,
    handlerSuggestion,
    'If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.',
  ].filter(Boolean)
  const message = messageTemplate.join('\n\n')

  switch (strategy) {
    case 'error': {
      console.error(`[MSW] Error: ${message}`)
      break
    }

    case 'warn': {
      console.warn(`[MSW] Warning: ${message}`)
      break
    }

    default:
      return
  }
}
