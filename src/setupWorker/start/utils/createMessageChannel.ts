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
    message: Parameters<ServiceWorkerFetchEventMap[Event]>[0] extends undefined
      ? { type: Event }
      : {
          type: Event
          payload: Parameters<ServiceWorkerFetchEventMap[Event]>[0]
        },
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
    send(message) {
      if (!port) {
        return
      }

      port.postMessage(message)
    },
  }
}
