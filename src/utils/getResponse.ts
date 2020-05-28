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
  H extends Array<RequestHandler<any, any>>
>(
  req: R,
  handlers: H,
): Promise<ResponsePayload> => {
  const [relevantHandler, parsedRequest]: [
    RequestHandler<any, any>,
    R,
  ] = handlers.reduce<any>((found, requestHandler) => {
    if ((found && found[0]) || requestHandler.isUsed) {
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
    // When responded with a one-time response, mark the current request handler
    // as used, skipping it from affecting any subsequent captured requests.
    relevantHandler.isUsed = true
  }

  return {
    handler: relevantHandler,
    response: mockedResponse,
    publicRequest,
    parsedRequest,
  }
}
