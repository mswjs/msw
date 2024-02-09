import { Emitter } from 'strict-event-emitter'
import type {
  WebSocketClientConnection,
  WebSocketServerConnection,
} from '@mswjs/interceptors/WebSocket'
import {
  type Match,
  type Path,
  type PathParams,
  matchRequestUrl,
} from '../utils/matching/matchRequestUrl'

type WebSocketHandlerParsedResult = {
  match: Match
}

export type WebSocketHandlerEventMap = {
  connection: [
    args: {
      client: WebSocketClientConnection
      server: WebSocketServerConnection
      params: PathParams
    },
  ]
}

type WebSocketHandlerIncomingEvent = MessageEvent<{
  client: WebSocketClientConnection
  server: WebSocketServerConnection
}>

export const kEmitter = Symbol('kEmitter')
export const kRun = Symbol('kRun')

export class WebSocketHandler {
  protected [kEmitter]: Emitter<WebSocketHandlerEventMap>

  constructor(private readonly url: Path) {
    this[kEmitter] = new Emitter()
  }

  public parse(args: {
    event: WebSocketHandlerIncomingEvent
  }): WebSocketHandlerParsedResult {
    const connection = args.event.data
    const match = matchRequestUrl(connection.client.url, this.url)

    return {
      match,
    }
  }

  public predicate(args: {
    event: WebSocketHandlerIncomingEvent
    parsedResult: WebSocketHandlerParsedResult
  }): boolean {
    const { match } = args.parsedResult
    return match.matches
  }

  async [kRun](args: { event: MessageEvent<any> }): Promise<void> {
    const parsedResult = this.parse({ event: args.event })
    const shouldIntercept = this.predicate({ event: args.event, parsedResult })

    if (!shouldIntercept) {
      return
    }

    const connectionEvent = args.event

    // At this point, the WebSocket connection URL has matched the handler.
    // Prevent the default behavior of establishing the connection as-is.
    connectionEvent.preventDefault()

    const connection = connectionEvent.data

    // Emit the connection event on the handler.
    // This is what the developer adds listeners for.
    this[kEmitter].emit('connection', {
      client: connection.client,
      server: connection.server,
      params: parsedResult.match.params || {},
    })
  }
}
