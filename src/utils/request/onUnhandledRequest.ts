import getStringMatchScore from 'js-levenshtein'
import { isGraphQLRequest } from '../internal/isGraphQLRequest'
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

function getSuggestedHandler(
  request: MockedRequest,
  handlers: RequestHandlersList,
): RequestHandler | undefined {
  const handlerGroups = handlers.reduce<{
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

  // Compose request handler groups relevant to the current request.
  // No need to look up the recommendations for a REST request in GraphQL handlers.
  const relevantHandlerGroups: RequestHandler<any, any>[] = [
    ...handlerGroups.rest,
    ...(isGraphQLRequest(request) ? handlerGroups.graphql : []),
  ]

  const handlersByScore = relevantHandlerGroups
    .reduce<[number, RequestHandler][]>((acc, handler) => {
      const metaInfo = handler.getMetaInfo()

      if (typeof metaInfo.mask !== 'string') {
        return acc
      }

      const requestPublicUrl = getPublicUrlFromRequest(request)
      const matchScore = getStringMatchScore(requestPublicUrl, metaInfo.mask)

      return acc.concat([[matchScore, handler]])
    }, [])
    .sort(([leftScore], [rightScore]) => {
      return leftScore - rightScore
    })

  const suggestedHandler = handlersByScore.find(([score]) => {
    // Control the relevance of the handler based on the string
    // similarity between its mask and request URL.
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

  let handlerSuggestion = ''
  const suggestedHandler = getSuggestedHandler(request, handlers)

  if (suggestedHandler) {
    const metaInfo = suggestedHandler.getMetaInfo()
    handlerSuggestion = `
Did you mean to request "${metaInfo.header}" instead?
`
  }

  const publicUrl = getPublicUrlFromRequest(request)

  const message = `captured a request without a matching request handler:

  • ${request.method} ${publicUrl}
${handlerSuggestion}
If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`

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
