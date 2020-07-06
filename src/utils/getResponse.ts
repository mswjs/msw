import { RequestHandlersList } from '../setupWorker/glossary'
import {
  RequestHandler,
  MockedRequest,
  defaultContext,
} from '../handlers/requestHandler'
import { MockedResponse, response } from '../response'

interface ResponsePayload {
  response: MockedResponse | null
  handler: RequestHandler<any, any> | null
  publicRequest?: any
  parsedRequest?: any
}

/**
 * Returns a mocked response for a given request using following request handlers.
 */
export const getResponse = async <
  R extends MockedRequest,
  H extends RequestHandlersList
>(
  req: R,
  handlers: H,
): Promise<ResponsePayload> => {
  const [relevantHandler, parsedRequest, mockedResponse, publicRequest]: [
    RequestHandler<any, any>,
    R,
    MockedResponse | null,
    any,
  ] = (await handlers.reduce<any>(async (handlerPromise, requestHandler) => {
    // Now the reduce function is async so I need to wait to understand if a response was found
    const handler = await handlerPromise
    // Skip any request handlers lookup if a handler is already found,
    // or the current handler is a one-time handler that's been already used.
    if ((handler && handler[0]) || requestHandler.shouldSkip) {
      return Promise.resolve(handler)
    }

    // Parse the captured request to get additional information.
    // Make the predicate function accept all the necessary information
    // to decide on the interception.
    const parsedRequest = requestHandler.parse
      ? requestHandler.parse(req)
      : null

    if (requestHandler.predicate(req, parsedRequest)) {
      const { getPublicRequest, defineContext, resolver } = requestHandler

      const publicRequest = getPublicRequest
        ? getPublicRequest(req, parsedRequest)
        : req
      const context = defineContext
        ? defineContext(publicRequest)
        : defaultContext

      const mockedResponse = await resolver(publicRequest, response, context)
      // Handle a scenario when a request handler is present,
      // but returns no mocked response (i.e. misses a `return res()` statement).
      // In this case we try to find another handler
      if (!mockedResponse) {
        return [null, null, null, null]
      }
      return [requestHandler, parsedRequest, mockedResponse, publicRequest]
    }
  }, Promise.resolve([]))) || [null, null, null, null]

  if (relevantHandler == null) {
    return {
      handler: null,
      response: null,
    }
  }

  if (!mockedResponse) {
    return {
      handler: relevantHandler,
      response: null,
    }
  }

  if (mockedResponse.once) {
    // When responded with a one-time response, match the relevant request handler
    // as skipped, so it cannot affect the captured requests anymore.
    relevantHandler.shouldSkip = true
  }

  return {
    handler: relevantHandler,
    response: mockedResponse,
    publicRequest,
    parsedRequest,
  }
}
