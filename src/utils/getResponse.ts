import { MockedResponse } from '../response'
import {
  DefaultBodyType,
  RequestHandler,
  RequestHandlerExecutionResult,
} from '../handlers/RequestHandler'
import { MockedRequest } from './request/MockedRequest'
import { Headers } from 'headers-polyfill'
import { batchGraphQLHandler } from '../handlers/BatchGraphQLHandler'
import { GraphQLRequest, GraphQLVariables } from '../handlers/GraphQLHandler'
import { encodeBuffer } from '@mswjs/interceptors'

export interface ResponseLookupResult {
  handler?: RequestHandler
  publicRequest?: any
  parsedRequest?: any
  response?: MockedResponse
}

export interface ResponseResolutionContext {
  baseUrl?: string
}

export const getBatchResponse = async <
  Request extends MockedRequest,
  Handler extends RequestHandler[],
>(
  request: Request,
  handlers: Handler,
  resolutionContext?: ResponseResolutionContext,
): Promise<ResponseLookupResult> => {
  if (request.body && Array.isArray(request.body)) {
    const results: ResponseLookupResult[] = await Promise.all(
      request.body.map((value: GraphQLRequest<GraphQLVariables>) => {
        return getResponse(
          new MockedRequest<DefaultBodyType>(request.url, {
            ...request,
            body: encodeBuffer(JSON.stringify(value)),
          }),
          handlers,
          resolutionContext,
        )
      }),
    )

    const body = results
      .filter((value) => {
        return value.response !== undefined
      })
      .map((value) => {
        return JSON.parse(value.response?.body)
      })

    const response = {
      body: JSON.stringify(body),
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      once: false,
      passthrough: false,
    }

    return {
      handler: batchGraphQLHandler,
      response,
    }
  }

  return {
    handler: undefined,
    response: undefined,
  }
}

/**
 * Returns a mocked response for a given request using following request handlers.
 */
export const getResponse = async <
  Request extends MockedRequest,
  Handler extends RequestHandler[],
>(
  request: Request,
  handlers: Handler,
  resolutionContext?: ResponseResolutionContext,
): Promise<ResponseLookupResult> => {
  const relevantHandlers = handlers.filter((handler) => {
    return handler.test(request, resolutionContext)
  })

  if (relevantHandlers.length === 0) {
    return {
      handler: undefined,
      response: undefined,
    }
  }

  const result = await relevantHandlers.reduce<
    Promise<RequestHandlerExecutionResult<any> | null>
  >(async (executionResult, handler) => {
    const previousResults = await executionResult

    if (!!previousResults?.response) {
      return executionResult
    }

    const result = await handler.run(request, resolutionContext)

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
