import { DeferredPromise } from '@open-draft/deferred-promise'
import type {
  WebSocketHandlerConnection,
  WebSocketResolutionContext,
} from '../../handlers/WebSocketHandler'
import { WebSocketPacket } from '../packets/websocket-packet'
import type { NetworkSession } from '../session'

export class NetworkWebSocketTransport {
  #session: NetworkSession

  constructor(args: { session: NetworkSession }) {
    this.#session = args.session
  }

  public async send(args: {
    clientUrl: URL
    resolutionContext?: WebSocketResolutionContext
  }): Promise<WebSocketHandlerConnection> {
    const promise = new DeferredPromise<WebSocketHandlerConnection>()
    const packet = new WebSocketPacket({
      url: args.clientUrl.toString(),
      resolutionContext: args.resolutionContext,
    })

    // const [intent, client] = await packet.send(this.#session).catch((error) => {
    //   promise.reject(error)
    // })

    /**
     * @todo Resolve with a Connection object that will
     * route any events from HERE to the REMOTE and back.
     *
     * @todo If the remote does NOT handle this connection,
     * reject the promise.
     */

    return promise
  }
}
