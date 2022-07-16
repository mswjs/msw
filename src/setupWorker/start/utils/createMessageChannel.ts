import {
  ServiceWorkerFetchEventMap,
  ServiceWorkerIncomingEventsMap,
} from '../../glossary'

export interface ServiceWorkerMessage<
  EventType extends keyof ServiceWorkerIncomingEventsMap,
  EventPayload,
> {
  type: EventType
  payload: EventPayload
}

export interface WorkerMessageChannel {
  send<Event extends keyof ServiceWorkerFetchEventMap>(
    message: {
      type: Event
      payload: ServiceWorkerFetchEventMap[Event]
    },
    transfers?: any[],
  ): void
}

/**
 * Creates a communication channel between the client
 * and the Service Worker associated with the given event.
 */
export function createMessageChannel(
  event: MessageEvent,
): WorkerMessageChannel {
  const port = event.ports[0]

  return {
    /**
     * Send a text message to the connected Service Worker.
     */
    send(message, transfers) {
      if (!port) {
        return
      }

      port.postMessage(message, transfers || [])
    },
  }
}
