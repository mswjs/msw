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
  const [relevantHandler, parsedRequest]: [
    RequestHandler<any, any>,
    R,
  ] = handlers.reduce<any>((found, requestHandler) => {
    // Skip any request handlers lookup if a handler is already found,
    // or the current handler is a one-time handler that's been already used.
    if ((found && found[0]) || requestHandler.shouldSkip) {
      return found
    }

    // Parse the captured request to get additional information.
    // Make the predicate function accept all the necessary information
    // to decide on the interception.
    const parsedRequest = requestHandler.parse
      ? requestHandler.parse(req)
      : null

    if (requestHandler.predicate(req, parsedRequest)) {
      return [requestHandler, parsedRequest]
    }
  }, []) || [null, null]

  if (relevantHandler == null) {
    return {
      handler: null,
      response: null,
    }
  }

  const { getPublicRequest, defineContext, resolver } = relevantHandler

  const publicRequest = getPublicRequest
    ? getPublicRequest(req, parsedRequest)
    : req
  const context = defineContext ? defineContext(publicRequest) : defaultContext

  const mockedResponse: MockedResponse | undefined = await resolver(
    publicRequest,
    response,
    context,
  )

  // Handle a scenario when a request handler is present,
  // but returns no mocked response (i.e. misses a `return res()` statement).
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
