import { Emitter } from 'strict-event-emitter'
import { createRequestId } from '@mswjs/interceptors'
import type { WebSocketConnectionData } from '@mswjs/interceptors/WebSocket'
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

export interface WebSocketHandlerConnection extends WebSocketConnectionData {
  params: PathParams
}

export const kEmitter = Symbol('kEmitter')
export const kDispatchEvent = Symbol('kDispatchEvent')
export const kSender = Symbol('kSender')
const kStopPropagationPatched = Symbol('kStopPropagationPatched')
const KOnStopPropagation = Symbol('KOnStopPropagation')

export class WebSocketHandler {
  private readonly __kind: HandlerKind

  public id: string
  public callFrame?: string

  protected [kEmitter]: Emitter<WebSocketHandlerEventMap>

  constructor(private readonly url: Path) {
    this.id = createRequestId()

    this[kEmitter] = new Emitter()
    this.callFrame = getCallFrame(new Error())
    this.__kind = 'EventHandler'
  }

  public parse(args: {
    event: MessageEvent<WebSocketConnectionData>
  }): WebSocketHandlerParsedResult {
    const { data: connection } = args.event
    const { url: clientUrl } = connection.client

    /**
     * @note Remove the Socket.IO path prefix from the WebSocket
     * client URL. This is an exception to keep the users from
     * including the implementation details in their handlers.
     */
    clientUrl.pathname = clientUrl.pathname.replace(/^\/socket.io\//, '/')

    const match = matchRequestUrl(clientUrl, this.url)

    return {
      match,
    }
  }

  public predicate(args: {
    event: MessageEvent<WebSocketConnectionData>
    parsedResult: WebSocketHandlerParsedResult
  }): boolean {
    return args.parsedResult.match.matches
  }

  async [kDispatchEvent](
    event: MessageEvent<WebSocketConnectionData>,
  ): Promise<void> {
    const parsedResult = this.parse({ event })
    const connection = event.data

    const resolvedConnection: WebSocketHandlerConnection = {
      ...connection,
      params: parsedResult.match.params || {},
    }

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
    this[kEmitter].emit('connection', resolvedConnection)
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
