import { TypedEvent } from 'rettime'
import { createRequestId } from '@mswjs/interceptors'
import { NetworkFrame, NetworkFrameResolutionContext } from './network-frame'
import { toPublicUrl } from '~/core/utils/request/toPublicUrl'
import { type HttpHandler } from '~/core/handlers/HttpHandler'
import { until } from 'until-async'
import { executeHandlers } from '~/core/utils/executeHandlers'
import { storeResponseCookies } from '~/core/utils/request/storeResponseCookies'
import { isPassthroughResponse, shouldBypassRequest } from '../request-utils'

interface HttpNetworkFrameOptions {
  id?: string
  request: Request
}

type HttpNetworkFrameEventMap = {
  'request:start': TypedEvent<{
    requestId: string
    request: Request
  }>
  'request:match': TypedEvent<{
    requestId: string
    request: Request
  }>
  'request:unhandled': TypedEvent<{
    requestId: string
    request: Request
  }>
  'request:end': TypedEvent<{
    requestId: string
    request: Request
  }>
  response: TypedEvent<{
    requestId: string
    request: Request
    response: Response
    isMockedResponse: boolean
  }>
  unhandledException: TypedEvent<{
    error: Error
    requestId: string
    request: Request
  }>
}

export abstract class HttpNetworkFrame extends NetworkFrame<
  'http',
  {
    id: string
    request: Request
  },
  HttpNetworkFrameEventMap
> {
  constructor(options: HttpNetworkFrameOptions) {
    const id = options.id || createRequestId()
    super('http', { id, request: options.request })
  }

  public abstract respondWith(response?: Response): void

  public async getUnhandledFrameMessage(): Promise<string> {
    const { request } = this.data

    const url = new URL(request.url)
    const publicUrl = toPublicUrl(url) + url.search
    const requestBody =
      request.body == null ? null : await request.clone().text()

    const details = `\n\n  \u2022 ${request.method} ${publicUrl}\n\n${requestBody ? `  \u2022 Request body: ${requestBody}\n\n` : ''}`
    const message = `intercepted a request without a matching request handler:${details}If you still wish to intercept this unhandled request, please create a request handler for it.\nRead more: https://mswjs.io/docs/http/intercepting-requests`

    return message
  }

  public async resolve(
    handlers: Array<HttpHandler>,
    resolutionContext?: NetworkFrameResolutionContext,
  ): Promise<boolean | null> {
    const { id: requestId, request } = this.data
    const requestCloneForLogs = resolutionContext?.quiet
      ? null
      : request.clone()

    this.events.emit(
      new TypedEvent('request:start', { data: { requestId, request } }),
    )

    // Requests wrapped in explicit `bypass(request)`.
    if (shouldBypassRequest(request)) {
      this.passthrough()
      return null
    }

    const [lookupError, lookupResult] = await until(() => {
      return executeHandlers({
        requestId,
        request,
        handlers,
        resolutionContext: {
          baseUrl: resolutionContext?.baseUrl?.toString(),
        },
      })
    })

    if (lookupError != null) {
      this.events.emit(
        new TypedEvent('unhandledException', {
          data: {
            error: lookupError,
            requestId,
            request,
          },
        }),
      )

      this.errorWith(lookupError)
      return null
    }

    // No matching handlers.
    if (lookupResult == null) {
      this.events.emit(
        new TypedEvent('request:unhandled', {
          data: { requestId, request },
        }),
      )

      this.events.emit(
        new TypedEvent('request:end', {
          data: { requestId, request },
        }),
      )

      this.passthrough()
      return false
    }

    const { response, handler, parsedResult } = lookupResult

    // Handlers that returned no mocked response.
    if (response == null) {
      this.events.emit(
        new TypedEvent('request:end', {
          data: { requestId, request },
        }),
      )

      this.passthrough()
      return null
    }

    // Handlers that returned explicit `passthrough()`.
    if (isPassthroughResponse(response)) {
      this.events.emit(
        new TypedEvent('request:end', {
          data: { requestId, request },
        }),
      )

      this.passthrough()
      return null
    }

    await storeResponseCookies(request, response)

    this.events.emit(
      new TypedEvent('request:match', {
        data: { requestId, request },
      }),
    )

    this.respondWith(response.clone())

    this.events.emit(
      new TypedEvent('request:end', {
        data: { requestId, request },
      }),
    )

    if (!resolutionContext?.quiet) {
      handler.log({
        request: requestCloneForLogs!,
        response,
        parsedResult,
      })
    }

    return true
  }
}
