// @ts-ignore
import * as jsLevenshtein from 'js-levenshtein'
import { RequestHandler, RestHandler, GraphQLHandler } from '../..'
import {
  ParsedGraphQLQuery,
  parseGraphQLRequest,
} from '../internal/parseGraphQLRequest'
import { getPublicUrlFromRequest } from './getPublicUrlFromRequest'
import { isStringEqual } from '../internal/isStringEqual'
import { devUtils } from '../internal/devUtils'

const getStringMatchScore = (jsLevenshtein as any).default

const MAX_MATCH_SCORE = 3
const MAX_SUGGESTION_COUNT = 4
const TYPE_MATCH_DELTA = 0.5

export interface UnhandledRequestPrint {
  warning(): void
  error(): void
}

export type UnhandledRequestCallback = (
  request: Request,
  print: UnhandledRequestPrint,
) => void

export type UnhandledRequestStrategy =
  | 'bypass'
  | 'warn'
  | 'error'
  | UnhandledRequestCallback

interface RequestHandlerGroups {
  rest: Array<RestHandler>
  graphql: Array<GraphQLHandler>
}

function groupHandlersByType(
  handlers: Array<RequestHandler>,
): RequestHandlerGroups {
  return handlers.reduce<RequestHandlerGroups>(
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

type RequestHandlerSuggestion = [number, RequestHandler]

type ScoreGetterFn<RequestHandlerType extends RequestHandler> = (
  request: Request,
  handler: RequestHandlerType,
) => number

function getRestHandlerScore(): ScoreGetterFn<RestHandler> {
  return (request, handler) => {
    const { path, method } = handler.info

    if (path instanceof RegExp || method instanceof RegExp) {
      return Infinity
    }

    const hasSameMethod = isStringEqual(request.method, method)

    // Always treat a handler with the same method as a more similar one.
    const methodScoreDelta = hasSameMethod ? TYPE_MATCH_DELTA : 0
    const requestPublicUrl = getPublicUrlFromRequest(request)
    const score = getStringMatchScore(requestPublicUrl, path)

    return score - methodScoreDelta
  }
}

function getGraphQLHandlerScore(
  parsedQuery: ParsedGraphQLQuery,
): ScoreGetterFn<GraphQLHandler> {
  return (_, handler) => {
    if (typeof parsedQuery.operationName === 'undefined') {
      return Infinity
    }

    const { operationType, operationName } = handler.info

    if (typeof operationName !== 'string') {
      return Infinity
    }

    const hasSameOperationType = parsedQuery.operationType === operationType
    // Always treat a handler with the same operation type as a more similar one.
    const operationTypeScoreDelta = hasSameOperationType ? TYPE_MATCH_DELTA : 0
    const score = getStringMatchScore(parsedQuery.operationName, operationName)

    return score - operationTypeScoreDelta
  }
}

function getSuggestedHandler(
  request: Request,
  handlers: Array<RestHandler> | Array<GraphQLHandler>,
  getScore: ScoreGetterFn<RestHandler> | ScoreGetterFn<GraphQLHandler>,
): Array<RequestHandler> {
  const suggestedHandlers = (handlers as Array<RequestHandler>)
    .reduce<Array<RequestHandlerSuggestion>>((suggestions, handler) => {
      const score = getScore(request, handler as any)
      return suggestions.concat([[score, handler]])
    }, [])
    .sort(([leftScore], [rightScore]) => leftScore - rightScore)
    .filter(([score]) => score <= MAX_MATCH_SCORE)
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

export async function onUnhandledRequest(
  request: Request,
  handlers: Array<RequestHandler>,
  strategy: UnhandledRequestStrategy = 'warn',
): Promise<void> {
  const parsedGraphQLQuery = await parseGraphQLRequest(request).catch(
    () => null,
  )

  function generateHandlerSuggestion(): string {
    /**
     * @note Ignore exceptions during GraphQL request parsing because at this point
     * we cannot assume the unhandled request is a valid GraphQL request.
     * If the GraphQL parsing fails, just don't treat it as a GraphQL request.
     */
    const handlerGroups = groupHandlersByType(handlers)
    const relevantHandlers = parsedGraphQLQuery
      ? handlerGroups.graphql
      : handlerGroups.rest

    const suggestedHandlers = getSuggestedHandler(
      request,
      relevantHandlers,
      parsedGraphQLQuery
        ? getGraphQLHandlerScore(parsedGraphQLQuery)
        : getRestHandlerScore(),
    )

    return suggestedHandlers.length > 0
      ? getSuggestedHandlersMessage(suggestedHandlers)
      : ''
  }

  function generateUnhandledRequestMessage(): string {
    const publicUrl = getPublicUrlFromRequest(request)
    const requestHeader = parsedGraphQLQuery
      ? `${parsedGraphQLQuery.operationType} ${parsedGraphQLQuery.operationName} (${request.method} ${publicUrl})`
      : `${request.method} ${publicUrl}`
    const handlerSuggestion = generateHandlerSuggestion()

    const messageTemplate = [
      `captured a request without a matching request handler:`,
      `  \u2022 ${requestHeader}`,
      handlerSuggestion,
      `\
If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks\
`,
    ].filter(Boolean)
    return messageTemplate.join('\n\n')
  }

  function applyStrategy(strategy: UnhandledRequestStrategy) {
    // Generate handler suggestions only when applying the strategy.
    // This saves bandwidth for scenarios when developers opt-out
    // from the default unhandled request handling strategy.
    const message = generateUnhandledRequestMessage()

    switch (strategy) {
      case 'error': {
        // Print a developer-friendly error.
        devUtils.error('Error: %s', message)

        // Throw an exception to halt request processing and not perform the original request.
        throw new Error(
          devUtils.formatMessage(
            'Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
          ),
        )
      }

      case 'warn': {
        devUtils.warn('Warning: %s', message)
        break
      }

      case 'bypass':
        break

      default:
        throw new Error(
          devUtils.formatMessage(
            'Failed to react to an unhandled request: unknown strategy "%s". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.',
            strategy,
          ),
        )
    }
  }

  if (typeof strategy === 'function') {
    strategy(request, {
      warning: applyStrategy.bind(null, 'warn'),
      error: applyStrategy.bind(null, 'error'),
    })
    return
  }

  applyStrategy(strategy)
}
