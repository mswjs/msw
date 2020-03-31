export interface ServiceWorkerMessage<T> {
  type: string
  payload: T
}

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
    send(message: string) {
      if (port) {
        port.postMessage(message)
      }
    },
  }
}

export type ServiceWorkerMessageHandler<T> = (
  message: ServiceWorkerMessage<T>,
  event: MessageEvent,
) => void

export const addMessageListener = <T>(
  type: string,
  handler: ServiceWorkerMessageHandler<T>,
  errorHandler?: () => void,
) => {
  const handleMessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data)

    if (message.type === type) {
      handler(message, event)
    }
  }

  navigator.serviceWorker.addEventListener('message', handleMessage)

  if (errorHandler) {
    navigator.serviceWorker.addEventListener('messageerror', errorHandler)
  }

  // Clean up the listener when page unloads
  window.addEventListener('beforeunload', () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage)

    if (errorHandler) {
      navigator.serviceWorker.removeEventListener('messageerror', errorHandler)
    }
  })
}
