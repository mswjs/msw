import { MockedResponse } from '../response'
import { MockedRequest, RequestHandler } from '../handlers/RequestHandler'

interface ResponsePayload {
  handler?: RequestHandler
  publicRequest?: any
  parsedRequest?: any
  response?: MockedResponse
}

const getResult = async <
  Request extends MockedRequest,
  Handlers extends RequestHandler[]
>(
  handlers: Handlers,
  request: Request,
) => {
  for (const handler of handlers) {
    const result = await handler.run(request)
    if (result && result.response && !result.handler.shouldSkip) {
      if (result.response.once) {
        handler.markAsSkipped(true)
      }
      return result
    }
  }

  return null
}

/**
 * Returns a mocked response for a given request using following request handlers.
 */
export const getResponse = async <
  Request extends MockedRequest,
  Handlers extends RequestHandler[]
>(
  request: Request,
  handlers: Handlers,
): Promise<ResponsePayload> => {
  const relevantHandlers = handlers.filter((handler) => {
    return handler.test(request)
  })

  if (relevantHandlers.length === 0) {
    return {
      handler: undefined,
      response: undefined,
    }
  }

  const result = await getResult(relevantHandlers, request)

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
