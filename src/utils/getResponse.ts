import { RequestHandlersList } from '../setupWorker/glossary'
import {
  RequestHandler,
  MockedRequest,
  defaultContext,
} from './handlers/requestHandler'
import { MockedResponse, response } from '../response'

interface ResponsePayload {
  response: MockedResponse | null
  handler: RequestHandler<any, any> | null
  publicRequest?: any
  parsedRequest?: any
}

interface ReducedHandlersPayload {
  requestHandler?: RequestHandler<any, any>
  parsedRequest?: any
  mockedResponse: MockedResponse | null
  publicRequest?: any
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
  const relevantHandlers = handlers
    .filter((requestHandler) => {
      // Skip a handler if it has been already used for a one-time response.
      return !requestHandler.shouldSkip
    })
    .map<[RequestHandler<any, any>, any]>((requestHandler) => {
      // Parse the captured request to get additional information.
      // Make the predicate function accept all the necessary information
      // to decide on the interception.
      const parsedRequest = requestHandler.parse
        ? requestHandler.parse(req)
        : null

      return [requestHandler, parsedRequest]
    })
    .filter(([requestHandler, parsedRequest]) => {
      return requestHandler.predicate(req, parsedRequest)
    })

  if (relevantHandlers.length == 0) {
    // Handle a scenario when a request has no relevant request handlers.
    // In that case it would be bypassed (performed as-is).
    return {
      handler: null,
      response: null,
    }
  }

  const {
    requestHandler,
    parsedRequest,
    mockedResponse,
    publicRequest,
  } = await relevantHandlers.reduce<Promise<ReducedHandlersPayload>>(
    async (asyncAcc, [requestHandler, parsedRequest]) => {
      // Now the reduce function is async so we need to await if response was found
      const acc = await asyncAcc

      // If a first not empty response was found we'll stop evaluating other requests
      if (acc.requestHandler) {
        return acc
      }

      const { getPublicRequest, defineContext, resolver } = requestHandler

      const publicRequest = getPublicRequest
        ? getPublicRequest(req, parsedRequest)
        : req

      const context = defineContext
        ? defineContext(publicRequest)
        : defaultContext

      const mockedResponse = await resolver(publicRequest, response, context)

      if (!mockedResponse) {
        return acc
      }

      if (mockedResponse && mockedResponse.once) {
        // When responded with a one-time response, match the relevant request handler
        // as skipped, so it cannot affect the captured requests anymore.
        requestHandler.shouldSkip = true
      }

      return {
        requestHandler,
        parsedRequest,
        mockedResponse,
        publicRequest,
      }
    },
    Promise.resolve({ mockedResponse: null }),
  )

  // Although reducing a list of relevant request handlers, it's possible
  // that in the end there will be no handler associted with the request
  // (i.e. if relevant handlers are fall-through).
  if (!requestHandler) {
    return {
      handler: null,
      response: null,
    }
  }

  return {
    handler: requestHandler,
    response: mockedResponse,
    publicRequest,
    parsedRequest,
  }
}
