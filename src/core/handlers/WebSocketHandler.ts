import { Emitter } from 'strict-event-emitter'
import { createRequestId, resolveWebSocketUrl } from '@mswjs/interceptors'
import type {
  WebSocketClientConnectionProtocol,
  WebSocketConnectionData,
  WebSocketServerConnectionProtocol,
} from '@mswjs/interceptors/WebSocket'
import {
  type Match,
  type Path,
  type PathParams,
  matchRequestUrl,
} from '../utils/matching/matchRequestUrl'
import { getCallFrame } from '../utils/internal/getCallFrame'
import type { HandlerKind } from './common'

type WebSocketHandlerParsedResult = {
  match: Match
}

export type WebSocketHandlerEventMap = {
  connection: [args: WebSocketHandlerConnection]
}

export interface WebSocketHandlerConnection {
  client: WebSocketClientConnectionProtocol
  server: WebSocketServerConnectionProtocol
  info: WebSocketConnectionData['info']
  params: PathParams
}

export interface WebSocketResolutionContext {
  baseUrl?: string
}

export const kEmitter = Symbol('kEmitter')
export const kSender = Symbol('kSender')
const kStopPropagationPatched = Symbol('kStopPropagationPatched')
const KOnStopPropagation = Symbol('KOnStopPropagation')

export class WebSocketHandler {
  private readonly __kind: HandlerKind

  public id: string
  public callFrame?: string

  protected [kEmitter]: Emitter<WebSocketHandlerEventMap>

  constructor(protected readonly url: Path) {
    this.id = createRequestId()

    this[kEmitter] = new Emitter()
    this.callFrame = getCallFrame(new Error())
    this.__kind = 'EventHandler'
  }

  public parse(args: {
    url: URL
    resolutionContext?: WebSocketResolutionContext
  }): WebSocketHandlerParsedResult {
    const clientUrl = new URL(args.url)

    // Resolve the WebSocket handler path:
    // - Plain string URLs resolved as per the specification (via Interceptors).
    // - String URLs starting with a wildcard are preserved (prepending a scheme there will break them).
    // - RegExp paths are preserved.
    const resolvedHandlerUrl =
      this.url instanceof RegExp || this.url.startsWith('*')
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
    url: URL
    parsedResult: WebSocketHandlerParsedResult
  }): boolean {
    return args.parsedResult.match.matches
  }

  public async run(
    connection: Omit<WebSocketHandlerConnection, 'params'>,
    resolutionContext?: WebSocketResolutionContext,
  ): Promise<boolean> {
    const parsedResult = this.parse({
      url: connection.client.url,
      resolutionContext,
    })

    if (!this.predicate({ url: connection.client.url, parsedResult })) {
      return false
    }

    const resolvedConnection: WebSocketHandlerConnection = {
      ...connection,
      params: parsedResult.match.params || {},
    }

    return this.connect(resolvedConnection)
  }

  protected connect(connection: WebSocketHandlerConnection): boolean {
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

    // Emit the connection event on the handler.
    // This is what the developer adds listeners for.
    return this[kEmitter].emit('connection', connection)
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
      | string
      | undefined

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
