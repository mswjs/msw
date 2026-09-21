import { Emitter, TypedEvent } from 'rettime'
import { createRequestId, resolveWebSocketUrl } from '@mswjs/interceptors'
import type {
  WebSocketProtocol,
  WebSocketConnectionInfo,
  WebSocketConnectionEventData,
  WebSocketClientHandle,
  WebSocketServerHandle,
} from '@mswjs/interceptors/WebSocket'
/**
 * @note A type-only import to prevent a runtime module cycle
 * (the frame module imports this handler at runtime).
 */
import type { WebSocketNetworkFrameEventMap } from '#core/experimental/frames/websocket-frame'
import {
  type Match,
  type Path,
  type PathParams,
  matchRequestUrl,
} from '#core/utils/matching/matchRequestUrl'
import { isAbsoluteUrl } from '#core/utils/url/isAbsoluteUrl'
import { Handler } from '#core/handlers/Handler'
import { getCallFrame } from '#core/utils/internal/getCallFrame'
import { attachWebSocketLogger } from './utils/attach-websocket-logger'

type WebSocketHandlerParsedResult = {
  match: Match
}

export interface WebSocketHandlerOptions {
  /**
   * A WebSocket connection protocol to encode/decode the traffic.
   */
  protocol?: WebSocketProtocol
}

export type WebSocketHandlerEventMap = {
  connection: WebSocketConnectionEvent
}

export interface WebSocketHandlerConnection {
  client: WebSocketClientHandle
  server: WebSocketServerHandle
  info: WebSocketConnectionInfo
  params: PathParams
}

export class WebSocketConnectionEvent
  extends TypedEvent<void, void, 'connection'>
  implements WebSocketHandlerConnection
{
  public readonly client: WebSocketClientHandle
  public readonly server: WebSocketServerHandle
  public readonly info: WebSocketConnectionInfo
  public readonly params: PathParams

  constructor(connection: WebSocketHandlerConnection) {
    super('connection')
    this.client = connection.client
    this.server = connection.server
    this.info = connection.info
    this.params = connection.params
  }
}

export interface WebSocketResolutionContext {
  baseUrl?: string

  /**
   * An emit-only reference to the network frame's events.
   * Allows handlers to emit additional events not covered by the frame
   * into the network's life-cycle event stream (e.g. `server.events`).
   */
  events?: Pick<Emitter<WebSocketNetworkFrameEventMap>, 'emit'>

  [kAutoConnect]?: boolean
}

export const kEmitter = Symbol('kEmitter')
export const kConnect = Symbol('kConnect')
export const kAutoConnect = Symbol('kAutoConnect')

const kStopPropagationPatched = Symbol('kStopPropagationPatched')
const KOnStopPropagation = Symbol('KOnStopPropagation')

export class WebSocketHandler extends Handler {
  public id: string
  public callFrame?: string

  public readonly kind = 'websocket'

  protected [kEmitter]: Emitter<WebSocketHandlerEventMap>
  protected readonly protocol?: WebSocketProtocol

  constructor(
    protected readonly url: Path,
    options?: WebSocketHandlerOptions,
  ) {
    super()

    this.id = createRequestId()
    this.protocol = options?.protocol

    this[kEmitter] = new Emitter()
    this.callFrame = getCallFrame(new Error())
  }

  public parse(args: {
    url: string | URL
    resolutionContext?: WebSocketResolutionContext
  }): WebSocketHandlerParsedResult {
    const clientUrl = new URL(args.url)

    // Resolve the WebSocket handler path:
    // - Relative string URLs are resolved against the base URL (via Interceptors).
    // - Absolute string URLs are preserved. Parsing them as a URL would
    //   percent-encode wildcards in the host (e.g. "ws://*" becomes "ws://%2A").
    // - String URLs starting with a wildcard are preserved (prepending a scheme there will break them).
    // - RegExp paths are preserved.
    const resolvedHandlerUrl =
      this.url instanceof RegExp ||
      isAbsoluteUrl(this.url) ||
      this.url.startsWith('*')
        ? this.url
        : this.#resolveWebSocketUrl(this.url, args.resolutionContext?.baseUrl)

    /**
     * @note Remove the Socket.IO path prefix from the WebSocket
     * client URL. This is an exception to keep the users from
     * including the implementation details in their handlers.
     */
    clientUrl.pathname = clientUrl.pathname.replace(/^\/socket.io\//, '/')

    const match = matchRequestUrl(
      clientUrl,
      resolvedHandlerUrl,
      args.resolutionContext?.baseUrl,
    )

    return {
      match,
    }
  }

  public predicate(args: {
    url: string | URL
    parsedResult: WebSocketHandlerParsedResult
  }): boolean {
    return args.parsedResult.match.matches
  }

  public test(
    url: string | URL,
    resolutionContext?: WebSocketResolutionContext & { strict?: boolean },
  ): boolean {
    return this.#match(url, resolutionContext) != null
  }

  public async run(
    connection: WebSocketConnectionEventData,
    resolutionContext?: WebSocketResolutionContext,
  ): Promise<WebSocketHandlerConnection | null> {
    const parsedResult = this.#match(connection.client.url, resolutionContext)

    if (parsedResult == null) {
      return null
    }

    // Every consumer of the connection objects (listeners, `link.broadcast()`,
    // the logger) speaks the protocol's message domain from here on.
    this.protocol?.apply(connection)

    const resolvedConnection: WebSocketHandlerConnection = {
      ...connection,
      params: parsedResult.match.params || {},
    }

    if (resolutionContext?.[kAutoConnect] ?? true) {
      if (this[kConnect](resolvedConnection)) {
        return resolvedConnection
      }

      return null
    }

    return resolvedConnection
  }

  #match(
    url: string | URL,
    resolutionContext?: WebSocketResolutionContext & { strict?: boolean },
  ): WebSocketHandlerParsedResult | null {
    const resolvedUrl = this.#resolveWebSocketUrl(
      url.toString(),
      resolutionContext?.baseUrl,
    )
    const parsedResult = this.parse({
      url: resolvedUrl,
      resolutionContext,
    })

    if (
      this.predicate({
        url,
        parsedResult,
      })
    ) {
      return parsedResult
    }

    return null
  }

  protected [kConnect](connection: WebSocketHandlerConnection): boolean {
    // Support `event.stopPropagation()` for various client/server events.
    connection.client.addEventListener(
      'message',
      createStopPropagationListener(this),
    )
    connection.client.addEventListener(
      'close',
      createStopPropagationListener(this),
    )

    connection.server.addEventListener(
      'open',
      createStopPropagationListener(this),
    )
    connection.server.addEventListener(
      'message',
      createStopPropagationListener(this),
    )
    connection.server.addEventListener(
      'error',
      createStopPropagationListener(this),
    )
    connection.server.addEventListener(
      'close',
      createStopPropagationListener(this),
    )

    /**
     * @fixme Await these events (e.g. via `.emitAsPromise()`) to have
     * exceptions from asynchronous listeners propagate properly.
     */
    return this[kEmitter].emit(new WebSocketConnectionEvent(connection))
  }

  public log(connection: WebSocketConnectionEventData): () => void {
    return attachWebSocketLogger(connection)
  }

  #resolveWebSocketUrl(url: string, baseUrl?: string): string {
    const resolvedUrl = resolveWebSocketUrl(
      baseUrl
        ? /**
           * @note Resolve against the base URL preemtively because `resolveWebSocketUrl` only
           * resolves against `location.href`, which is missing in Node.js. Base URL allows
           * the handler to accept a relative URL in Node.js.
           */
          new URL(url, baseUrl)
        : url,
    )

    /**
     * @note Omit the trailing slash.
     * While the browser always produces a trailing slash at the end of a WebSocket URL,
     * having it in as the handler's predicate would mean it is *required* in the actual URL.
     */
    return resolvedUrl.replace(/\/$/, '')
  }
}

function createStopPropagationListener(handler: WebSocketHandler) {
  return function stopPropagationListener(event: Event) {
    const propagationStoppedAt = Reflect.get(event, 'kPropagationStoppedAt') as
      string | undefined

    if (propagationStoppedAt && handler.id !== propagationStoppedAt) {
      event.stopImmediatePropagation()
      return
    }

    Object.defineProperty(event, KOnStopPropagation, {
      value(this: WebSocketHandler) {
        Object.defineProperty(event, 'kPropagationStoppedAt', {
          value: handler.id,
        })
      },
      configurable: true,
    })

    // Since the same event instance is shared between all client/server objects,
    // make sure to patch its `stopPropagation` method only once.
    if (!Reflect.get(event, kStopPropagationPatched)) {
      event.stopPropagation = new Proxy(event.stopPropagation, {
        apply: (target, thisArg, args) => {
          Reflect.get(event, KOnStopPropagation)?.call(handler)
          return Reflect.apply(target, thisArg, args)
        },
      })

      Object.defineProperty(event, kStopPropagationPatched, {
        value: true,
        // If something else attempts to redefine this, throw.
        configurable: false,
      })
    }
  }
}
