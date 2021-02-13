import { MockedResponse } from '../response'
import {
  MockedRequest,
  RequestHandler,
  RequestHandlerExecutionResult,
} from '../handlers/RequestHandler'

interface ResponsePayload {
  response: MockedResponse | undefined
  handler: RequestHandler | null
  publicRequest?: any
  parsedRequest?: any
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
): Promise<ResponsePayload> => {
  const relevantHandlers = handlers.filter((handler) => {
    return handler.test(request)
  })

  if (relevantHandlers.length === 0) {
    return {
      handler: null,
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
    result?.handler

    if (result === null || !result.response || result.handler.shouldSkip) {
      return null
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
      handler: null,
      response: undefined,
    }
  }

  return {
    parsedRequest: result.parsedResult,
    response: result.response,
    /**
     * @fixme This is not a public request: lacks parsed results.
     */
    publicRequest: request,
    handler: result.handler,
  }
}
