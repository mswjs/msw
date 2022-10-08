import {
  RequestHandler,
  RequestHandlerExecutionResult,
} from '../handlers/RequestHandler'

export interface ResponseLookupResult {
  handler?: RequestHandler
  request: Request
  parsedRequest?: any
  response?: Response
}

export interface ResponseResolutionContext {
  baseUrl?: string
}

async function filterAsync<Item>(
  target: Array<Item>,
  predicate: (item: Item) => Promise<boolean>,
): Promise<Array<Item>> {
  const results = await Promise.all(target.map(predicate))
  return target.filter((_, index) => results[index])
}

/**
 * Returns a mocked response for a given request using following request handlers.
 */
export const getResponse = async <Handler extends Array<RequestHandler>>(
  request: Request,
  handlers: Handler,
  resolutionContext?: ResponseResolutionContext,
): Promise<ResponseLookupResult> => {
  const relevantHandlers = await filterAsync(handlers, (handler) => {
    return handler.test(request, resolutionContext)
  })

  if (relevantHandlers.length === 0) {
    return {
      request,
      handler: undefined,
      response: undefined,
    }
  }

  const result = await relevantHandlers.reduce<
    Promise<RequestHandlerExecutionResult | null>
  >(async (executionResult, handler) => {
    const previousResults = await executionResult

    if (!!previousResults?.response) {
      return executionResult
    }

    const result = await handler.run(request, resolutionContext)

    if (result === null || result.handler.shouldSkip) {
      return null
    }

    if (!result.response) {
      return {
        request: result.request,
        handler: result.handler,
        response: undefined,
        parsedResult: result.parsedResult,
      }
    }

    /**
     * @todo Support `res.once()` alternative.
     */
    // if (result.response.once) {
    //   handler.markAsSkipped(true)
    // }

    return result
  }, Promise.resolve(null))

  // Although reducing a list of relevant request handlers, it's possible
  // that in the end there will be no handler associted with the request
  // (i.e. if relevant handlers are fall-through).
  if (!result) {
    return {
      request,
      handler: undefined,
      response: undefined,
    }
  }

  return {
    handler: result.handler,
    request: result.request,
    parsedRequest: result.parsedResult,
    response: result.response,
  }
}
