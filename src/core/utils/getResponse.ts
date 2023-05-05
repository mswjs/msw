import {
  RequestHandler,
  RequestHandlerExecutionResult,
} from '../handlers/RequestHandler'

export interface ResponseLookupResult {
  handler: RequestHandler
  parsedRequest: any
  response?: Response
}

export interface ResponseResolutionContext {
  baseUrl?: string
}

/**
 * Returns a mocked response for a given request using following request handlers.
 */
export const getResponse = async <Handler extends Array<RequestHandler>>(
  request: Request,
  handlers: Handler,
  resolutionContext?: ResponseResolutionContext,
): Promise<ResponseLookupResult | null> => {
  let matchingHandler: RequestHandler | null = null
  let result: RequestHandlerExecutionResult<any> | null = null

  for (const handler of handlers) {
    result = await handler.run(request, resolutionContext)

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
      parsedRequest: result?.parsedResult,
      response: result?.response,
    }
  }

  return null
}
