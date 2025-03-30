import { BatchHandler } from '../handlers/BatchHandler'
import {
  RequestHandler,
  type RequestHandlerExecutionResult,
} from '../handlers/RequestHandler'

export interface HandlersExecutionResult {
  handler: RequestHandler
  parsedResult?: any
  response?: Response
}

export interface ResponseResolutionContext {
  baseUrl?: string
}

/**
 * Executes the list of request handlers against the given request.
 * Returns the execution result object containing any matching request
 * handler and any mocked response it returned.
 */
export const executeHandlers = async <
  Handlers extends Array<RequestHandler | BatchHandler>,
>({
  request,
  requestId,
  handlers,
  resolutionContext,
}: {
  request: Request
  requestId: string
  handlers: Handlers
  resolutionContext?: ResponseResolutionContext
}): Promise<HandlersExecutionResult | null> => {
  let matchingHandler: RequestHandler | null = null
  let result: RequestHandlerExecutionResult<any> | null = null

  // Flatten the handlers to account for batched handlers.
  const flatHandlers = handlers.flatMap((handler) => {
    if (handler instanceof BatchHandler) {
      return handler.unwrapHandlers('RequestHandler')
    }

    return handler
  })

  for (const handler of flatHandlers) {
    result = await handler.run({ request, requestId, resolutionContext })

    // If the handler produces some result for this request,
    // it automatically becomes matching.
    if (result !== null) {
      matchingHandler = handler
    }

    // Stop the lookup if this handler returns a mocked response.
    // If it doesn't, it will still be considered the last matching
    // handler until any of them returns a response. This way we can
    // distinguish between fallthrough handlers without responses
    // and the lack of a matching handler.
    if (result?.response) {
      break
    }
  }

  if (matchingHandler) {
    return {
      handler: matchingHandler,
      parsedResult: result?.parsedResult,
      response: result?.response,
    }
  }

  return null
}
