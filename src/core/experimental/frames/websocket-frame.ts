import { TypedEvent } from 'rettime'
import type { GraphQLSubscriptionEvent } from '#graphql/graphql-subscription-event'
import type { WebSocketConnectionData } from '@mswjs/interceptors/WebSocket'
import {
  kConnect,
  kAutoConnect,
  type WebSocketHandler,
} from '#ws/websocket-handler'
import {
  NetworkFrame,
  type NetworkFrameResolutionContext,
} from './network-frame'
import {
  executeUnhandledFrameHandle,
  type UnhandledFrameHandle,
} from '../on-unhandled-frame'
import { devUtils } from '../../utils/internal/devUtils'
import type { HandlersController } from '../handlers-controller'
import type { AnyHandler } from '../handlers-controller'

export interface WebSocketNetworkFrameOptions {
  connection: WebSocketConnectionData
}

export type WebSocketNetworkFrameEventMap = {
  /**
   * Emitted when a WebSocket connection is intercepted,
   * before any handlers are resolved against it.
   */
  'websocket:connection': WebSocketConnectionEvent
  /**
   * Emitted when the WebSocket connection errors.
   * This includes initial connection errors as well as runtime errors
   * after the connection has been established.
   */
  'websocket:error': WebSocketErrorEvent
  'graphql:subscription': GraphQLSubscriptionEvent
  unhandledException: WebSocketErrorEvent
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

class WebSocketErrorEvent<
  DataType extends {
    url: URL
    protocols: string | Array<string> | undefined
    error: unknown
  } = {
    url: URL
    protocols: string | Array<string> | undefined
    error: unknown
  },
  ReturnType = void,
  EventType extends string = string,
> extends WebSocketConnectionEvent<DataType, ReturnType, EventType> {
  public readonly error: unknown

  constructor(type: EventType, data: DataType) {
    super(type, data)
    this.error = data.error
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

  public getHandlers(controller: HandlersController): Array<AnyHandler> {
    return controller.getHandlersByKind('websocket')
  }

  public async resolve(
    handlers: Array<WebSocketHandler>,
    onUnhandledFrame: UnhandledFrameHandle,
    resolutionContext?: NetworkFrameResolutionContext,
  ): Promise<boolean | null> {
    const { connection } = this.data

    this.events.emit(
      new WebSocketConnectionEvent('websocket:connection', {
        url: connection.client.url,
        protocols: connection.info.protocols,
      }),
    )

    const handleSocketError = (event: Event) => {
      this.events.emit(
        new WebSocketErrorEvent('websocket:error', {
          url: connection.client.url,
          protocols: connection.info.protocols,
          error: getErrorFromEvent(event),
        }),
      )
    }

    connection.client.socket.addEventListener('error', handleSocketError)
    connection.client.socket.addEventListener(
      'close',
      () => {
        connection.client.socket.removeEventListener('error', handleSocketError)
      },
      { once: true },
    )

    // No WebSocket handlers defined.
    if (handlers.length === 0) {
      await executeUnhandledFrameHandle(this, onUnhandledFrame).then(
        () => this.passthrough(),
        (error) => this.errorWith(error),
      )

      return false
    }

    let hasMatchingHandlers = false

    for (const handler of handlers) {
      const handlerConnection = await handler.run(connection, {
        baseUrl: resolutionContext?.baseUrl?.toString(),
        /**
         * @note Expose an emit-only reference to this frame's events
         * so the handlers can emit additional events not covered by
         * the frame (e.g. "graphql:subscription").
         */
        events: this.events,
        /**
         * @note Do not emit the handler's "connection" event when running the handler.
         * Use the run only to get the resolved connection object.
         */
        [kAutoConnect]: false,
      })

      if (!handlerConnection) {
        continue
      }

      hasMatchingHandlers = true

      /**
       * @note Attach the WebSocket logger *before* emitting the handler's "connection" event.
       * Connection event listeners may perform actions that should be reflected in the logs
       * (e.g. closing the connection immediately). If the logger is attached after the connection,
       * those actions cannot be properly logged.
       */
      const removeLogger = !resolutionContext?.quiet
        ? handler.log(connection)
        : undefined

      try {
        if (!handler[kConnect](handlerConnection)) {
          removeLogger?.()
        }
      } catch (error) {
        if (
          !this.events.emit(
            new WebSocketErrorEvent('unhandledException', {
              error,
              url: connection.client.url,
              protocols: connection.info.protocols,
            }),
          )
        ) {
          console.error(error)
          devUtils.error(
            'Encountered an unhandled exception during the handler lookup for "%s". Please see the original error above.',
            connection.client.url,
          )
        }

        /**
         * @note Throw the caught error so it gets picked up by WebSocketInterceptor.
         * It's the interceptor who translates handler errors to WebSocket closures.
         */
        throw error
      }
    }

    // No matching WebSocket handlers found.
    if (!hasMatchingHandlers) {
      await executeUnhandledFrameHandle(this, onUnhandledFrame).then(
        () => this.passthrough(),
        (error) => this.errorWith(error),
      )

      return false
    }

    return true
  }

  public async getUnhandledMessage(): Promise<string> {
    const { connection } = this.data
    const details = `\n\n  \u2022 ${connection.client.url}\n\n`

    return `intercepted a WebSocket connection without a matching event handler:${details}If you still wish to intercept this unhandled connection, please create an event handler for it.\nRead more: https://mswjs.io/docs/websocket`
  }
}

/**
 * Extract the error from the given "error" event, if any.
 * Supports both the `ErrorEvent.error` property and the `cause`
 * property that MSW sets when erroring the connection itself.
 */
function getErrorFromEvent(event: Event): unknown {
  if ('error' in event && event.error != null) {
    return event.error
  }

  if ('cause' in event && event.cause != null) {
    return event.cause
  }

  return undefined
}
