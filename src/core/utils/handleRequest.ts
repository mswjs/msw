import { until } from '@open-draft/until'
import { Emitter } from 'strict-event-emitter'
import { RequestHandler } from '../handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '../sharedOptions'
import { RequiredDeep } from '../typeUtils'
import { ResponseLookupResult, getResponse } from './getResponse'
import { onUnhandledRequest } from './request/onUnhandledRequest'
import { readResponseCookies } from './request/readResponseCookies'

export interface HandleRequestOptions {
  /**
   * Transforms a `MockedResponse` instance returned from a handler
   * to a response instance supported by the lower tooling (i.e. interceptors).
   */
  transformResponse?(response: Response): Response

  /**
   * Invoked whenever a request is performed as-is.
   */
  onPassthroughResponse?(request: Request): void

  /**
   * Invoked when the mocked response is ready to be sent.
   */
  onMockedResponse?(
    response: Response,
    handler: RequiredDeep<ResponseLookupResult>,
  ): void
}

export async function handleRequest(
  request: Request,
  requestId: string,
  handlers: Array<RequestHandler>,
  options: RequiredDeep<SharedOptions>,
  emitter: Emitter<LifeCycleEventsMap>,
  handleRequestOptions?: HandleRequestOptions,
): Promise<Response | undefined> {
  emitter.emit('request:start', { request, requestId })

  // Perform bypassed requests (i.e. issued via "ctx.fetch") as-is.
  if (request.headers.get('x-msw-intention') === 'bypass') {
    emitter.emit('request:end', { request, requestId })
    handleRequestOptions?.onPassthroughResponse?.(request)
    return
  }

  // Resolve a mocked response from the list of request handlers.
  const lookupResult = await until(() => {
    return getResponse(request, handlers)
  })

  if (lookupResult.error) {
    // Allow developers to react to unhandled exceptions in request handlers.
    emitter.emit('unhandledException', {
      error: lookupResult.error,
      request,
      requestId,
    })
    throw lookupResult.error
  }

  // If the handler lookup returned nothing, no request handler was found
  // matching this request. Report the request as unhandled.
  if (!lookupResult.data) {
    await onUnhandledRequest(request, handlers, options.onUnhandledRequest)
    emitter.emit('request:unhandled', { request, requestId })
    emitter.emit('request:end', { request, requestId })
    handleRequestOptions?.onPassthroughResponse?.(request)
    return
  }

  const { response } = lookupResult.data

  // When the handled request returned no mocked response, warn the developer,
  // as it may be an oversight on their part. Perform the request as-is.
  if (!response) {
    emitter.emit('request:end', { request, requestId })
    handleRequestOptions?.onPassthroughResponse?.(request)
    return
  }

  // Perform the request as-is when the developer explicitly returned "req.passthrough()".
  // This produces no warning as the request was handled.
  if (
    response.status === 302 &&
    response.headers.get('x-msw-intention') === 'passthrough'
  ) {
    emitter.emit('request:end', { request, requestId })
    handleRequestOptions?.onPassthroughResponse?.(request)
    return
  }

  // Store all the received response cookies in the virtual cookie store.
  readResponseCookies(request, response)

  emitter.emit('request:match', { request, requestId })

  const requiredLookupResult =
    lookupResult.data as RequiredDeep<ResponseLookupResult>

  const transformedResponse =
    handleRequestOptions?.transformResponse?.(response) ||
    (response as any as Response)

  handleRequestOptions?.onMockedResponse?.(
    transformedResponse,
    requiredLookupResult,
  )

  emitter.emit('request:end', { request, requestId })

  return transformedResponse
}
