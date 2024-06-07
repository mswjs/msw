import { Emitter } from 'strict-event-emitter'
import type { WebSocketConnectionData } from '@mswjs/interceptors/WebSocket'
import {
  type Match,
  type Path,
  type PathParams,
  matchRequestUrl,
} from '../utils/matching/matchRequestUrl'
import { getCallFrame } from '../utils/internal/getCallFrame'

type WebSocketHandlerParsedResult = {
  match: Match
}

export type WebSocketHandlerEventMap = {
  connection: [args: WebSocketHandlerConnection]
}

interface WebSocketHandlerConnection extends WebSocketConnectionData {
  params: PathParams
}

export const kEmitter = Symbol('kEmitter')
export const kDispatchEvent = Symbol('kDispatchEvent')
export const kSender = Symbol('kSender')

export class WebSocketHandler {
  public callFrame?: string

  protected [kEmitter]: Emitter<WebSocketHandlerEventMap>

  constructor(private readonly url: Path) {
    this[kEmitter] = new Emitter()
    this.callFrame = getCallFrame(new Error())
  }

  public parse(args: {
    event: MessageEvent<WebSocketConnectionData>
  }): WebSocketHandlerParsedResult {
    const connection = args.event.data
    const match = matchRequestUrl(connection.client.url, this.url)

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

    // Emit the connection event on the handler.
    // This is what the developer adds listeners for.
    this[kEmitter].emit('connection', resolvedConnection)
  }
}
