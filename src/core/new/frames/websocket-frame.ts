import { WebSocketConnectionData } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket'
import { BaseNetworkFrame } from './base-frame'

type WebSocketNetworkFrameEventMap = {
  'websocket:connection': [
    args: {
      url: URL
      protocols: string | Array<string> | undefined
    },
  ]
}

export abstract class WebSocketNetworkFrame extends BaseNetworkFrame<
  'ws',
  {
    connection: WebSocketConnectionData
  },
  WebSocketNetworkFrameEventMap
> {
  constructor(args: { connection: WebSocketConnectionData }) {
    super('ws', {
      connection: args.connection,
    })
  }

  /**
   * Establish the intercepted WebSocket connection as-is.
   */
  public abstract passthrough(): unknown

  public async getUnhandledFrameMessage(): Promise<string> {
    const { connection } = this.data
    const details = `\n\n \u2022 ${connection.client.url}\n\n`

    return `intercepted a WebSocket connection without a matching event handler:${details}If you still wish to intercept this unhandled connection, please create an event handler for it.\nRead more: https://mswjs.io/docs/websocket`
  }
}
