import { until } from 'until-async'
import { isHandlerKind } from '../utils/internal/isHandlerKind'
import type { AnyHandler } from './handlers-controller'
import { NetworkFrame } from './sources/index'
import {
  isPassthroughResponse,
  shouldBypassRequest,
} from '../utils/internal/requestUtils'
import { executeHandlers } from '../utils/executeHandlers'
import { storeResponseCookies } from '../utils/request/storeResponseCookies'
import { HttpNetworkFrame } from './frames/http-frame'
import { WebSocketNetworkFrame } from './frames/websocket-frame'

/**
 * Resolve a network frame against the given list of handlers.
 * @param frame A network frame.
 * @param handlers A list of handlers.
 * @returns A boolean indicating whether this frame has been handled.
 */
export async function resolveNetworkFrame(
  frame: NetworkFrame,
  handlers: Array<AnyHandler>,
): Promise<boolean> {
  switch (frame.protocol) {
    case 'http': {
      return resolveHttpNetworkFrame(frame, handlers)
    }

    /**
     * WebSocket.
     */
    case 'ws': {
      return resolveWebSocketNetworkFrame(frame, handlers)
    }

    default: {
      throw new Error(
        // @ts-expect-error Runtime error.
        `Failed to resolve a network frame: unsupported protocol "${frame.protocol}"`,
      )
    }
  }
}

async function resolveHttpNetworkFrame(
  frame: HttpNetworkFrame,
  handlers: Array<AnyHandler>,
): Promise<boolean> {
  const requestId = frame.id
  const request = frame.data.request.clone()
  const requestCloneForLogs = request.clone()

  frame.events.emit('request:start', { request, requestId })

  // Perform requests wrapped in "bypass()" as-is.
  if (shouldBypassRequest(request)) {
    frame.passthrough()
    return true
  }

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
    frame.events.emit('unhandledException', {
      error: lookupError,
      request,
      requestId,
    })
    frame.errorWith(lookupError)
    return false
  }

  // If the handler lookup returned nothing, no request handler was found
  // matching this request. Report the request as unhandled.
  if (!lookupResult) {
    frame.events.emit('request:unhandled', { request, requestId })
    frame.events.emit('request:end', { request, requestId })
    frame.passthrough()
    return false
  }

  const { response, handler, parsedResult } = lookupResult

  // When the handled request returned no mocked response, warn the developer,
  // as it may be an oversight on their part. Perform the request as-is.
  if (!response) {
    frame.events.emit('request:end', { request, requestId })
    frame.passthrough()
    return true
  }

  // Perform the request as-is when the developer explicitly returned `passthrough()`.
  // This produces no warning as the request was handled.
  if (isPassthroughResponse(response)) {
    frame.events.emit('request:end', { request, requestId })
    frame.passthrough()
    return true
  }

  // Store all the received response cookies in the cookie jar.
  await storeResponseCookies(request, response)

  frame.events.emit('request:match', { request, requestId })

  frame.respondWith(response.clone())

  frame.events.emit('request:end', { request, requestId })

  /**
   * @fixme This doesn't belong here. Different network APIs might choose
   * to handle logging differently (e.g. `setupServer` doesn't log at all).
   * This likely belongs in an abstract method on `defineNetwork()` or something.
   */
  // Log mocked responses. Use the Network tab to observe the original network.
  handler.log({
    request: requestCloneForLogs,
    response,
    parsedResult,
  })

  return true
}

async function resolveWebSocketNetworkFrame(
  frame: WebSocketNetworkFrame,
  handlers: Array<AnyHandler>,
): Promise<boolean> {
  const { connection } = frame.data
  const eventHandlers = handlers.filter(isHandlerKind('EventHandler'))

  frame.events.emit('websocket:connection', {
    url: connection.client.url,
    protocols: connection.info.protocols,
  })

  if (eventHandlers.length > 0) {
    await Promise.all(
      eventHandlers.map((handler) => {
        // Foward the connection data to every WebSocket handler.
        // This is equivalent to dispatching the connection event
        // onto multiple listeners.
        return handler.run(connection)
      }),
    )

    return true
  }

  /**
   * @todo Support WebSocket logging, somehow.
   */

  frame.passthrough()
  return false
}
