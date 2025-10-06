import { until } from 'until-async'
import {
  WebSocketHandler,
  type WebSocketHandlerConnection,
  type WebSocketResolutionContext,
} from '../../handlers/WebSocketHandler'
import { NetworkSession } from '../session'
import { NetworkWebSocketTransport } from '../transports/websocket-transport'

export class RemoteWebSocketHandler extends WebSocketHandler {
  #transport: NetworkWebSocketTransport

  constructor(args: { session: NetworkSession }) {
    super(/.*/)

    this.#transport = new NetworkWebSocketTransport({
      session: args.session,
    })
  }

  public async run(
    connection: Omit<WebSocketHandlerConnection, 'params'>,
    resolutionContext?: WebSocketResolutionContext,
  ): Promise<boolean> {
    const [error, remoteConnection] = await until(() => {
      return this.#transport.send({
        clientUrl: connection.client.url,
        resolutionContext,
      })
    })

    /**
     * @todo Check if rejecting with no reason still falls through this check.
     */
    if (error) {
      return false
    }

    /**
     * @todo How will this work if THIS process has a WS client emitting events
     * and THAT process has event listeners? Should we serialize those events now?
     */
    return this.connect(remoteConnection)
  }
}
