import { MockedResponse } from '../response'
import {
  MockedRequest,
  RequestHandler,
  RequestHandlerExecutionResult,
} from '../handlers/RequestHandler'

export interface ResponseLookupResult {
  handler?: RequestHandler
  publicRequest?: any
  parsedRequest?: any
  response?: MockedResponse
}

/**
 * Returns a mocked response for a given request using following request handlers.
 */
export const getResponse = async <
  Request extends MockedRequest,
  Handler extends RequestHandler[]
>(
  request: Request,
  handlers: Handler,
): Promise<ResponseLookupResult> => {
  const relevantHandlers = handlers.filter((handler) => {
    return handler.test(request)
  })

  if (relevantHandlers.length === 0) {
    return {
      handler: undefined,
      response: undefined,
    }
  }

  const result = await relevantHandlers.reduce<
    Promise<RequestHandlerExecutionResult<any> | null>
  >(async (acc, handler) => {
    const previousResults = await acc

    if (!!previousResults?.response) {
      return acc
    }

    const result = await handler.run(request)

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

    if (result.response.once) {
      handler.markAsSkipped(true)
    }

    return result
  }, Promise.resolve(null))

  // Although reducing a list of relevant request handlers, it's possible
  // that in the end there will be no handler associted with the request
  // (i.e. if relevant handlers are fall-through).
  if (!result) {
    return {
      handler: undefined,
      response: undefined,
    }
  }

  return {
    handler: result.handler,
    publicRequest: result.request,
    parsedRequest: result.parsedResult,
    response: result.response,
  }
}
