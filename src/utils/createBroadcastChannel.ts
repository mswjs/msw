export interface ServiceWorkerMessage<T> {
  type: string
  payload: T
}

export type ClientMessageTypes =
  | 'MOCK_NOT_FOUND'
  | 'MOCK_SUCCESS'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR'

/**
 * Creates a communication channel between the client
 * and the Service Worker associated with the given event.
 */
export const createBroadcastChannel = (event: MessageEvent) => {
  const port = event.ports[0]

  return {
    /**
     * Sends a text message to the connected Service Worker.
     */
    send(message: {
      type: ClientMessageTypes
      payload?: Record<string, any> | string
    }) {
      if (port) {
        port.postMessage(message)
      }
    },
  }
}
