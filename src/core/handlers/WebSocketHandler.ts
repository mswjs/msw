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
import { Handler } from './Handler'

type WebSocketHandlerParsedResult = {
  match: Match
}

type WebSocketHandlerEventMap = {
  connection: [
    args: {
      client: WebSocketClientConnection
      server: WebSocketServerConnection
      params: PathParams
    },
  ]
}

export class WebSocketHandler extends Handler<MessageEvent<any>> {
  public on: <K extends keyof WebSocketHandlerEventMap>(
    event: K,
    listener: (...args: WebSocketHandlerEventMap[K]) => void,
  ) => void

  public off: <K extends keyof WebSocketHandlerEventMap>(
    event: K,
    listener: (...args: WebSocketHandlerEventMap[K]) => void,
  ) => void

  public removeAllListeners: <K extends keyof WebSocketHandlerEventMap>(
    event?: K,
  ) => void

  protected emitter: Emitter<WebSocketHandlerEventMap>

  constructor(private readonly url: Path) {
    super()
    this.emitter = new Emitter()

    // Forward some of the emitter API to the public API
    // of the event handler.
    this.on = this.emitter.on.bind(this.emitter)
    this.off = this.emitter.off.bind(this.emitter)
    this.removeAllListeners = this.emitter.removeAllListeners.bind(this.emitter)
  }

  public parse(args: {
    input: MessageEvent<any>
  }): WebSocketHandlerParsedResult {
    const connection = args.input.data
    const match = matchRequestUrl(connection.client.url, this.url)

    return {
      match,
    }
  }

  public predicate(args: {
    input: MessageEvent<any>
    parsedResult: WebSocketHandlerParsedResult
  }): boolean {
    const { match } = args.parsedResult
    return match.matches
  }

  protected async handle(args: {
    input: MessageEvent<any>
    parsedResult: WebSocketHandlerParsedResult
  }): Promise<void> {
    const connectionEvent = args.input

    // At this point, the WebSocket connection URL has matched the handler.
    // Prevent the default behavior of establishing the connection as-is.
    connectionEvent.preventDefault()

    const connection = connectionEvent.data

    // Emit the connection event on the handler.
    // This is what the developer adds listeners for.
    this.emitter.emit('connection', {
      client: connection.client,
      server: connection.server,
      params: args.parsedResult.match.params || {},
    })
  }
}
