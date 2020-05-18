import { match } from 'node-match-path'
import { getCleanUrl } from 'node-request-interceptor/lib/utils/getCleanUrl'
import {
  RequestHandler,
  MockedRequest,
  defaultContext,
} from '../handlers/requestHandler'
import { MockedResponse, response } from '../response'
import { resolveRelativeUrl } from './resolveRelativeUrl'

interface ResponsePayload {
  response: MockedResponse | null
  handler: RequestHandler<any, any> | null
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
  const relevantHandler = handlers.find((requestHandler) => {
    return requestHandler.predicate(req)
  })

  if (relevantHandler == null) {
    return {
      response: null,
      handler: null,
    }
  }

  const { mask, defineContext, resolver } = relevantHandler

  // Retrieve request URL parameters based on the provided mask
  const params =
    (mask && match(resolveRelativeUrl(mask), getCleanUrl(req.url)).params) || {}

  const requestWithParams: MockedRequest = {
    ...req,
    params,
  }

  const context = defineContext
    ? defineContext(requestWithParams)
    : defaultContext

  const mockedResponse: MockedResponse | undefined = await resolver(
    requestWithParams,
    response,
    context,
  )

  // Handle a scenario when a request handler is present,
  // but returns no mocked response (i.e. misses a `return res()` statement).
  if (!mockedResponse) {
    return {
      response: null,
      handler: relevantHandler,
    }
  }

  return {
    response: mockedResponse,
    handler: relevantHandler,
  }
}
