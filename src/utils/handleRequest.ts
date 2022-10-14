import { until } from '@open-draft/until'
import { StrictEventEmitter } from 'strict-event-emitter'
import { RequestHandler } from '../handlers/RequestHandler'
import { ServerLifecycleEventsMap } from '../node/glossary'
import { SharedOptions } from '../sharedOptions'
import { RequiredDeep } from '../typeUtils'
import { ResponseLookupResult, getResponse } from './getResponse'
import { devUtils } from './internal/devUtils'
import { onUnhandledRequest } from './request/onUnhandledRequest'
import { readResponseCookies } from './request/readResponseCookies'

export interface HandleRequestOptions {
  /**
   * Options for the response resolution process.
   */
  resolutionContext?: {
    baseUrl?: string
  }

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
  emitter: StrictEventEmitter<ServerLifecycleEventsMap>,
  handleRequestOptions?: HandleRequestOptions,
): Promise<Response | undefined> {
  emitter.emit('request:start', request, requestId)

  // Perform bypassed requests (i.e. issued via "ctx.fetch") as-is.
  if (request.headers.get('x-msw-bypass') === 'true') {
    emitter.emit('request:end', request, requestId)
    handleRequestOptions?.onPassthroughResponse?.(request)
    return
  }

  // Resolve a mocked response from the list of request handlers.
  const [lookupError, lookupResult] = await until(() => {
    return getResponse(
      request,
      handlers,
      handleRequestOptions?.resolutionContext,
    )
  })

  if (lookupError) {
    // Allow developers to react to unhandled exceptions in request handlers.
    emitter.emit('unhandledException', lookupError, request, requestId)
    throw lookupError
  }

  const { handler, response } = lookupResult

  // When there's no handler for the request, consider it unhandled.
  // Allow the developer to react to such cases.
  if (!handler) {
    onUnhandledRequest(request, handlers, options.onUnhandledRequest)
    emitter.emit('request:unhandled', request, requestId)
    emitter.emit('request:end', request, requestId)
    handleRequestOptions?.onPassthroughResponse?.(request)
    return
  }

  // When the handled request returned no mocked response, warn the developer,
  // as it may be an oversight on their part. Perform the request as-is.
  if (!response) {
    devUtils.warn(
      `\
Expected response resolver to return a mocked response Object, but got %s. The original response is going to be used instead.\
\n
  \u2022 %s
    %s\
`,
      response,
      handler.info.header,
      handler.info.callFrame,
    )

    emitter.emit('request:end', request, requestId)
    handleRequestOptions?.onPassthroughResponse?.(request)
    return
  }

  // When the developer explicitly returned "req.passthrough()" do not warn them.
  // Perform the request as-is.
  if (response.status === 101) {
    emitter.emit('request:end', request, requestId)
    handleRequestOptions?.onPassthroughResponse?.(request)
    return
  }

  response.headers.set('X-Powered-By', 'msw')

  // Store all the received response cookies in the virtual cookie store.
  readResponseCookies(request, response)

  emitter.emit('request:match', request, requestId)

  const requiredLookupResult =
    lookupResult as RequiredDeep<ResponseLookupResult>

  const transformedResponse =
    handleRequestOptions?.transformResponse?.(response) ||
    (response as any as Response)

  handleRequestOptions?.onMockedResponse?.(
    transformedResponse,
    requiredLookupResult,
  )

  emitter.emit('request:end', request, requestId)

  return transformedResponse
}
