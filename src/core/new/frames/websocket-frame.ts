import { TypedEvent } from 'rettime'
import { type WebSocketConnectionData } from '@mswjs/interceptors/WebSocket'
import { type WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import {
  NetworkFrame,
  type NetworkFrameResolutionContext,
} from './network-frame'

export interface WebSocketNetworkFrameOptions {
  connection: WebSocketConnectionData
}

export type WebSocketNetworkFrameEventMap = {
  connection: TypedEvent<{
    url: URL
    protocols: string | Array<string> | undefined
  }>
}

export abstract class WebSocketNetworkFrame extends NetworkFrame<
  'ws',
  {
    connection: WebSocketConnectionData
  },
  WebSocketNetworkFrameEventMap
> {
  constructor(options: WebSocketNetworkFrameOptions) {
    super('ws', {
      connection: options.connection,
    })
  }

  public async resolve(
    handlers: Array<WebSocketHandler>,
    resolutionContext?: NetworkFrameResolutionContext,
  ): Promise<boolean | null> {
    const { connection } = this.data

    this.events.emit(
      new TypedEvent('connection', {
        data: {
          url: connection.client.url,
          protocols: connection.info.protocols,
        },
      }),
    )

    if (handlers.length === 0) {
      return false
    }

    const matchingHandlers = await Promise.all(
      handlers.map(async (handler) => {
        const matches = await handler.run(connection, {
          baseUrl: resolutionContext?.baseUrl?.toString(),
        })

        if (!matches) {
          return null
        }

        if (!resolutionContext?.quiet) {
          handler.log(connection)
        }

        return handler
      }),
    )

    if (matchingHandlers.every((handler) => handler == null)) {
      this.passthrough()
      return null
    }

    return true
  }

  public async getUnhandledFrameMessage(): Promise<string> {
    const { connection } = this.data
    const details = `\n\n  \u2022 ${connection.client.url}\n\n`

    return `intercepted a WebSocket connection without a matching event handler:${details}If you still wish to intercept this unhandled connection, please create an event handler for it.\nRead more: https://mswjs.io/docs/websocket`
  }
}
