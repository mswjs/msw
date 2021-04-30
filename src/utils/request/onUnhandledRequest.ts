import getStringMatchScore from 'js-levenshtein'
import {
  ParsedGraphQLQuery,
  parseGraphQLRequest,
} from '../internal/parseGraphQLRequest'
import { getPublicUrlFromRequest } from './getPublicUrlFromRequest'
import { isStringEqual } from '../internal/isStringEqual'
import { RestHandler } from '../../handlers/RestHandler'
import { GraphQLHandler } from '../../handlers/GraphQLHandler'
import { MockedRequest, RequestHandler } from '../../handlers/RequestHandler'

const MAX_MATCH_SCORE = 3
const MAX_SUGGESTION_COUNT = 4
const TYPE_MATCH_DELTA = 0.5

type UnhandledRequestCallback = (request: MockedRequest) => void

export type UnhandledRequestStrategy =
  | 'bypass'
  | 'warn'
  | 'error'
  | UnhandledRequestCallback

function groupHandlersByType(handlers: RequestHandler[]) {
  return handlers.reduce<{
    rest: RestHandler[]
    graphql: GraphQLHandler[]
  }>(
    (groups, handler) => {
      if (handler instanceof RestHandler) {
        groups.rest.push(handler)
      }

      if (handler instanceof GraphQLHandler) {
        groups.graphql.push(handler)
      }

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
    const { mask, method } = handler.info

    if (mask instanceof RegExp) {
      return Infinity
    }

    const hasSameMethod = isStringEqual(request.method, method)
    // Always treat a handler with the same method as a more similar one.
    const methodScoreDelta = hasSameMethod ? TYPE_MATCH_DELTA : 0
    const requestPublicUrl = getPublicUrlFromRequest(request)
    const score = getStringMatchScore(requestPublicUrl, mask)

    return score - methodScoreDelta
  }
}

function getScoreForGraphQLHandler(
  parsedQuery: ParsedGraphQLQuery,
): ScoreGetterFn {
  return (_, handler) => {
    if (typeof parsedQuery.operationName === 'undefined') {
      return Infinity
    }

    const { operationType, operationName } = handler.info
    const hasSameOperationType = parsedQuery.operationType === operationType
    // Always treat a handler with the same operation type as a more similar one.
    const operationTypeScoreDelta = hasSameOperationType ? TYPE_MATCH_DELTA : 0
    const score = getStringMatchScore(parsedQuery.operationName, operationName)

    return score - operationTypeScoreDelta
  }
}

function getSuggestedHandler(
  request: MockedRequest,
  handlers: RequestHandler[],
  getScore: ScoreGetterFn,
): RequestHandler[] {
  const suggestedHandlers = handlers
    .reduce<RequestHandlerSuggestionList>((acc, handler) => {
      const score = getScore(request, handler)
      return acc.concat([[score, handler]])
    }, [])
    .sort(([leftScore], [rightScore]) => {
      return leftScore - rightScore
    })
    .filter(([score]) => {
      return score <= MAX_MATCH_SCORE
    })
    .slice(0, MAX_SUGGESTION_COUNT)
    .map(([, handler]) => handler)

  return suggestedHandlers
}

function getSuggestedHandlersMessage(handlers: RequestHandler[]) {
  if (handlers.length > 1) {
    return `\
Did you mean to request one of the following resources instead?

${handlers.map((handler) => `  • ${handler.info.header}`).join('\n')}`
  }

  return `Did you mean to request "${handlers[0].info.header}" instead?`
}

export function onUnhandledRequest(
  request: MockedRequest,
  handlers: RequestHandler[],
  strategy: UnhandledRequestStrategy = 'warn',
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

  const suggestedHandlers = getSuggestedHandler(
    request,
    relevantHandlers,
    parsedGraphQLQuery
      ? getScoreForGraphQLHandler(parsedGraphQLQuery)
      : getScoreForRestHandler(),
  )

  const handlerSuggestion =
    suggestedHandlers.length > 0
      ? getSuggestedHandlersMessage(suggestedHandlers)
      : ''

  const publicUrl = getPublicUrlFromRequest(request)
  const requestHeader = parsedGraphQLQuery
    ? `${parsedGraphQLQuery.operationType} ${parsedGraphQLQuery.operationName} (${request.method} ${publicUrl})`
    : `${request.method} ${publicUrl}`

  const messageTemplate = [
    `captured a request without a matching request handler:`,
    `  \u2022 ${requestHeader}`,
    handlerSuggestion,
    `\
If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks\
`,
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

    case 'bypass':
      break

    default:
      throw new Error(
        `[MSW] Failed to react to an unhandled request: unknown strategy "${strategy}". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function.`,
      )
  }
}
