import { mergeRight } from '../utils/internal/mergeRight'
import { WebSocketLinkOptions, WebSocketServerEventMap } from './glossary'
import { logger } from './logger'
import { WebSocketServer } from './WebSocketServer'
import { setupWebSocketEnvironment } from './ws-env'

// Create a broadcast channel that synchronizes events originated from a single tab
// across multiple tabs of the same origin.
export const channel =
  typeof BroadcastChannel === 'undefined'
    ? undefined
    : new BroadcastChannel('ws-channel')

if (!window.WebSocket.__mswOverride) {
  setupWebSocketEnvironment()
}

const WEBSOCKET_LINK_DEFAULT_OPTIONS: WebSocketLinkOptions = {
  quiet: false,
}

export const ws = {
  /**
   * Creates a WebSocket server that can intercept any client-side events
   * to the given URL and send events to all subscribed clients.
   */
  link(mask: string, options?: WebSocketLinkOptions) {
    const server = new WebSocketServer(mask, channel)

    const resolvedOptions = mergeRight(
      WEBSOCKET_LINK_DEFAULT_OPTIONS,
      options || {},
    ) as WebSocketLinkOptions

    // Events logger.
    if (!resolvedOptions.quiet) {
      logger(server)
    }

    // Whenever this tab receives a broadcast message from another tab
    // that a WebSocket message has been sent from the server,
    // propagate that message to all the clients of this tab to stay in sync.
    channel?.addEventListener('message', (event) => {
      server.sendToAllClients(event.data)
    })

    return {
      on<EventType extends keyof WebSocketServerEventMap>(
        eventType: EventType,
        listener: WebSocketServerEventMap[EventType],
      ) {
        server.addListener(eventType, listener)
      },

      /**
       * Closes a WebSocket server so it can no longer receive or send events.
       */
      close() {
        server.close()
      },
    }
  },
}
