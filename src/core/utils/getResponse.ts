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

/**
 * Returns a mocked response for a given request using following request handlers.
 */
export const getResponse = async <Handler extends Array<RequestHandler>>(
  request: Request,
  handlers: Handler,
  resolutionContext?: ResponseResolutionContext,
): Promise<ResponseLookupResult> => {
  let result: RequestHandlerExecutionResult<any> | null = null

  for (const handler of handlers) {
    result = await handler.run(request, resolutionContext)

    // If the handler yields no result, it doesn't match this request.
    // We should continue iterating through handlers.
    if (result === null) {
      continue
    }

    // If the handler yields a response, it matched this request
    // and its resolved has produced a mocked response. The rest
    // of the handlers can have no effect on this request anymore.
    if (typeof result.response !== 'undefined') {
      break
    }
  }

  // const result = await handlers.reduce<
  //   Promise<RequestHandlerExecutionResult<any> | null>
  // >(async (executionResult, handler) => {
  //   const previousResults = await executionResult

  //   if (!!previousResults?.response) {
  //     return executionResult
  //   }

  //   const result = await handler.run(request, resolutionContext)

  //   if (result === null) {
  //     return null
  //   }

  //   if (!result.response) {
  //     return {
  //       request: result.request,
  //       handler: result.handler,
  //       response: undefined,
  //       parsedResult: result.parsedResult,
  //     }
  //   }

  //   return result
  // }, Promise.resolve(null))

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
