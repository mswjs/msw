import { until } from 'until-async'
import { createRequestId } from '@mswjs/interceptors'
import { isHandlerKind } from '../utils/internal/isHandlerKind'
import { AnyHandler } from './handlers-controller'
import { NetworkFrame } from './sources/index'
import {
  isPassthroughResponse,
  shouldBypassRequest,
} from '../utils/internal/requestUtils'
import { executeHandlers } from '../utils/executeHandlers'
import { storeResponseCookies } from '../utils/request/storeResponseCookies'
// import { onUnhandledRequest } from '../utils/request/onUnhandledRequest'

export async function resolveNetworkFrame(
  frame: NetworkFrame,
  handlers: Array<AnyHandler>,
): Promise<void> {
  // const emitter = {}

  switch (frame.protocol) {
    case 'http': {
      const { request } = frame.data

      // Perform requests wrapped in "bypass()" as-is.
      if (shouldBypassRequest(request)) {
        return frame.passthrough()
      }

      const requestId = createRequestId()
      const requestHandlers = handlers.filter(isHandlerKind('RequestHandler'))

      const [lookupError, lookupResult] = await until(() => {
        return executeHandlers({
          request,
          requestId,
          handlers: requestHandlers,
          resolutionContext: {},
        })
      })

      if (lookupError) {
        // Allow developers to react to unhandled exceptions in request handlers.
        // emitter.emit('unhandledException', {
        //   error: lookupError,
        //   request,
        //   requestId,
        // })
        throw lookupError
      }

      // If the handler lookup returned nothing, no request handler was found
      // matching this request. Report the request as unhandled.
      if (!lookupResult) {
        // await onUnhandledRequest(request, options.onUnhandledRequest)
        // emitter.emit('request:unhandled', { request, requestId })
        // emitter.emit('request:end', { request, requestId })
        return frame.passthrough()
      }

      const { response } = lookupResult

      // When the handled request returned no mocked response, warn the developer,
      // as it may be an oversight on their part. Perform the request as-is.
      if (!response) {
        // emitter.emit('request:end', { request, requestId })
        return frame.passthrough()
      }

      // Perform the request as-is when the developer explicitly returned `passthrough()`.
      // This produces no warning as the request was handled.
      if (isPassthroughResponse(response)) {
        // emitter.emit('request:end', { request, requestId })
        return frame.passthrough()
      }

      // Store all the received response cookies in the cookie jar.
      await storeResponseCookies(request, response)

      // emitter.emit('request:match', { request, requestId })

      frame.respondWith(response)

      // emitter.emit('request:end', { request, requestId })

      break
    }

    case 'ws': {
      /** @todo */
      break
    }

    default: {
      throw new Error(
        // @ts-expect-error Runtime error.
        `Failed to resolve a network frame: unsupported protocol "${frame.protocol}"`,
      )
    }
  }
}
