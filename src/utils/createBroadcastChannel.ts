import { MSWEventListener } from '../utils/internal/mswEventListener'
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

export type ServiceWorkerMessageHandler<T> = (
  message: ServiceWorkerMessage<T>,
  event: MessageEvent,
) => void

export const addMessageListener = <T>(
  type: string,
  handler: ServiceWorkerMessageHandler<T>,
  errorHandler?: () => void,
) => {
  const listeners: MSWEventListener[] = []
  const handleMessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data)

    if (message.type === type) {
      handler(message, event)
    }
  }

  navigator.serviceWorker.addEventListener('message', handleMessage)
  listeners.push({
    type: 'message',
    handler: navigator.serviceWorker,
    listener: handleMessage,
  })
  if (errorHandler) {
    navigator.serviceWorker.addEventListener('messageerror', errorHandler)
    listeners.push({
      type: 'messageerror',
      handler: navigator.serviceWorker,
      listener: errorHandler,
    })
  }

  // Clean up the listener when page unloads
  const beforeUnload = () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage)

    if (errorHandler) {
      navigator.serviceWorker.removeEventListener('messageerror', errorHandler)
    }
  }
  window.addEventListener('beforeunload', beforeUnload)
  listeners.push({
    type: 'beforeunload',
    handler: window,
    listener: beforeUnload,
  })
  return listeners
}
