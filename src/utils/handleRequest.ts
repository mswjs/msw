import { StrictEventEmitter } from 'strict-event-emitter'
import { MockedRequest, RequestHandler } from '../handlers/RequestHandler'
import { ServerLifecycleEventsMap } from '../node/glossary'
import { MockedResponse } from '../response'
import { SharedOptions } from '../sharedOptions'
import { ResponseLookupResult, getResponse } from './getResponse'
import { onUnhandledRequest } from './request/onUnhandledRequest'
import { readResponseCookies } from './request/readResponseCookies'

export interface HandleRequestOptions<ResponseType> {
  /**
   * Transforms a `MockedResponse` instance returned from a handler
   * to a response instance
   */
  transformResponse?(response: MockedResponse<string>): ResponseType

  /**
   * Invoked whenever returning a bypassed (as-is) response.
   */
  onBypassResponse?(request: MockedRequest): void

  /**
   * Invoked when the mocked response is ready to be sent.
   */
  onMockedResponse?(
    response: ResponseType,
    handler: DeepRequired<ResponseLookupResult>,
  ): void

  /**
   * Invoked when the mocked response is sent.
   * Respects the response delay duration.
   */
  onMockedResponseSent?(
    response: ResponseType,
    handler: DeepRequired<ResponseLookupResult>,
  ): void
}

export async function handleRequest<
  ResponseType extends Record<string, any> = MockedResponse<string>
>(
  request: MockedRequest,
  handlers: RequestHandler[],
  options: SharedOptions,
  emitter: StrictEventEmitter<ServerLifecycleEventsMap>,
  handleRequestOptions?: HandleRequestOptions<ResponseType>,
): Promise<ResponseType | undefined> {
  emitter.emit('request:start', request)

  // Perform bypassed requests (i.e. issued via "ctx.fetch") as-is.
  if (request.headers.get('x-msw-bypass')) {
    emitter.emit('request:end', request)
    handleRequestOptions?.onBypassResponse?.(request)
    return
  }

  // Resolve a mocked response from the list of request handlers.
  const lookupResult = await getResponse(request, handlers)
  const { handler, response } = lookupResult

  // When there's no handler for the request, consider it unhandled.
  // Allow the developer to react to such cases.
  if (!handler) {
    onUnhandledRequest(request, handlers, options.onUnhandledRequest)
    emitter.emit('request:unhandled', request)
    emitter.emit('request:end', request)
    handleRequestOptions?.onBypassResponse?.(request)
    return
  }

  // When the handled request returned no mocked response, warn the developer,
  // as it may be an oversight on their part. Perform the request as-is.
  if (!response) {
    console.warn(
      '[MSW] Expected a mocking resolver function to return a mocked response Object, but got: %s. Original response is going to be used instead.',
      response,
    )

    emitter.emit('request:end', request)
    handleRequestOptions?.onBypassResponse?.(request)
    return
  }

  // Store all the received response cookies in the virtual cookie store.
  readResponseCookies(request, response)

  emitter.emit('request:match', request)

  return new Promise((resolve) => {
    const requiredLookupResult = lookupResult as DeepRequired<ResponseLookupResult>
    const transformedResponse =
      handleRequestOptions?.transformResponse?.(response) ||
      ((response as any) as ResponseType)

    handleRequestOptions?.onMockedResponse?.(
      transformedResponse,
      requiredLookupResult,
    )

    setTimeout(() => {
      handleRequestOptions?.onMockedResponseSent?.(
        transformedResponse,
        requiredLookupResult,
      )
      emitter.emit('request:end', request)

      resolve(transformedResponse as ResponseType)
    }, response.delay ?? 0)
  })
}
