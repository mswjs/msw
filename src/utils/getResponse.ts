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
  const relevantHandlers = handlers.filter((requestHandler) => {
    //Skip current handler  if is a one-time handler that's been already used.
    if (requestHandler.shouldSkip) {
      return false
    }

    // Parse the captured request to get additional information.
    // Make the predicate function accept all the necessary information
    // to decide on the interception.
    const parsedRequest = requestHandler.parse
      ? requestHandler.parse(req)
      : null

    if (requestHandler.predicate(req, parsedRequest)) {
      return true
    }

    return false
  })

  if (relevantHandlers.length == 0) {
    return {
      handler: null,
      response: null,
    }
  }

  const handlerResponse = (await relevantHandlers.reduce(
    async (handlerPromise, currentHandler) => {
      // Now the reduce function is async so I need to wait to understand if a response was found
      const handler = await handlerPromise

      //If a first not empty response was found we'll stop evaluating other requests
      if (handler[0]) {
        return handler
      }
      const { getPublicRequest, defineContext, resolver } = currentHandler

      const parsedRequest = currentHandler.parse
        ? currentHandler.parse(req)
        : null

      const publicRequest = getPublicRequest
        ? getPublicRequest(req, parsedRequest)
        : req

      const context = defineContext
        ? defineContext(publicRequest)
        : defaultContext

      const mockedResponse = await resolver(publicRequest, response, context)

      if (!mockedResponse) {
        return handler
      }

      if (mockedResponse && mockedResponse.once) {
        // When responded with a one-time response, match the relevant request handler
        // as skipped, so it cannot affect the captured requests anymore.
        currentHandler.shouldSkip = true
      }

      return [currentHandler, parsedRequest, mockedResponse, publicRequest]
    },
    Promise.resolve([null, null, null, null]),
  )) || [null, null, null, null]

  const [
    relevantHandler,
    parsedRequest,
    mockedResponse,
    publicRequest,
  ] = handlerResponse

  // Handle a scenario when a request handler is present,
  // but returns no mocked response (i.e. misses a `return res()` statement).
  if (!mockedResponse) {
    return {
      handler: relevantHandler,
      response: null,
    }
  }

  return {
    handler: relevantHandler,
    response: mockedResponse,
    publicRequest,
    parsedRequest,
  }
}
