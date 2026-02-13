import { TypedEvent } from 'rettime'
import { type WebSocketConnectionData } from '@mswjs/interceptors/WebSocket'
import {
  kConnect,
  kAutoConnect,
  type WebSocketHandler,
} from '../../handlers/WebSocketHandler'
import {
  NetworkFrame,
  type NetworkFrameResolutionContext,
} from './network-frame'
import {
  executeUnhandledFrameHandle,
  UnhandledFrameHandle,
} from '../on-unhandled-frame'

export interface WebSocketNetworkFrameOptions {
  connection: WebSocketConnectionData
}

export type WebSocketNetworkFrameEventMap = {
  connection: WebSocketConnectionEvent
}

class WebSocketConnectionEvent<
  DataType extends {
    url: URL
    protocols: string | Array<string> | undefined
  } = { url: URL; protocols: string | Array<string> | undefined },
  ReturnType = void,
  EventType extends string = string,
> extends TypedEvent<DataType, ReturnType, EventType> {
  public readonly url: URL
  public readonly protocols: string | Array<string> | undefined

  constructor(type: EventType, data: DataType) {
    super(...([type, {}] as any))
    this.url = data.url
    this.protocols = data.protocols
  }
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
    onUnhandledFrame: UnhandledFrameHandle,
    resolutionContext?: NetworkFrameResolutionContext,
  ): Promise<boolean | null> {
    const { connection } = this.data

    this.events.emit(
      new WebSocketConnectionEvent('connection', {
        url: connection.client.url,
        protocols: connection.info.protocols,
      }),
    )

    // No WebSocket handlers defined.
    if (handlers.length === 0) {
      await executeUnhandledFrameHandle(this, onUnhandledFrame).then(
        () => this.passthrough(),
        (error) => this.errorWith(error),
      )

      return false
    }

    const matchingHandlers = await Promise.all(
      handlers.filter(async (handler) => {
        const handlerConnection = await handler.run(connection, {
          baseUrl: resolutionContext?.baseUrl?.toString(),
          /**
           * @note Do not emit the "connection" event when running the handler.
           * Use the run only to get the resolved connection object.
           */
          [kAutoConnect]: false,
        })

        if (!handlerConnection) {
          return false
        }

        /**
         * @note Attach the WebSocket logger *before* emitting the "connection" event.
         * Connection event listeners may perform actions that should be reflected in the logs
         * (e.g. closing the connection immediately). If the logger is attached after the connection,
         * those actions cannot be properly logged.
         */
        const removeLogger = !resolutionContext?.quiet
          ? handler.log(connection)
          : undefined

        if (!handler[kConnect](handlerConnection)) {
          removeLogger?.()
        }

        return true
      }),
    )

    // No matching WebSocket handlers found.
    if (matchingHandlers.length === 0) {
      await executeUnhandledFrameHandle(this, onUnhandledFrame).then(
        () => this.passthrough(),
        (error) => this.errorWith(error),
      )

      return false
    }

    return true
  }

  public async getUnhandledFrameMessage(): Promise<string> {
    const { connection } = this.data
    const details = `\n\n  \u2022 ${connection.client.url}\n\n`

    return `intercepted a WebSocket connection without a matching event handler:${details}If you still wish to intercept this unhandled connection, please create an event handler for it.\nRead more: https://mswjs.io/docs/websocket`
  }
}
